import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import {
  Category,
  WarehouseStock,
  WarehouseReceipt,
  WarehouseReceiptItem,
  Allocation,
  AllocationItem,
  Donation,
  DonationItem,
  DonationStatus,
  AllocationStatus,
  ItemCondition,
} from '@/database/entities';
import {
  CreateReceiptDto,
  CreateAllocationDto,
  UpdateAllocationStatusDto,
  ListAllocationsQueryDto,
} from '@/warehouse/dto';
import {
  ResourceNotFoundException,
  ConflictException,
} from '@/common/exceptions';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(WarehouseStock)
    private stockRepository: Repository<WarehouseStock>,
    @InjectRepository(WarehouseReceipt)
    private receiptRepository: Repository<WarehouseReceipt>,
    @InjectRepository(WarehouseReceiptItem)
    private receiptItemRepository: Repository<WarehouseReceiptItem>,
    @InjectRepository(Allocation)
    private allocationRepository: Repository<Allocation>,
    @InjectRepository(AllocationItem)
    private allocationItemRepository: Repository<AllocationItem>,
    @InjectRepository(Donation)
    private donationRepository: Repository<Donation>,
    @InjectRepository(DonationItem)
    private donationItemRepository: Repository<DonationItem>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private dataSource: DataSource,
  ) {}

  async listStocks(page = 1, limit = 20) {
    const qb = this.stockRepository.createQueryBuilder('stock')
      .leftJoinAndSelect('stock.category', 'category');
    const total = await qb.getCount();
    const skip = (page - 1) * limit;
    const stocks = await qb.skip(skip).take(limit).getMany();

    return {
      data: stocks,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async createReceipt(createdById: string, createDto: CreateReceiptDto) {
    const donation = await this.donationRepository.findOne({
      where: { id: createDto.donationId },
      relations: ['items'],
    });

    if (!donation) {
      throw new ResourceNotFoundException('Donation', createDto.donationId);
    }

    if (donation.status !== DonationStatus.APPROVED) {
      throw new ConflictException('Only approved donations can be received');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create receipt
      const receipt = queryRunner.manager.create(WarehouseReceipt, {
        donationId: donation.id,
        createdById,
      });
      const savedReceipt = await queryRunner.manager.save(receipt);

      // Create receipt items & update stock
      for (const item of donation.items) {
        // Create receipt item
        const receiptItem = queryRunner.manager.create(WarehouseReceiptItem, {
          receiptId: savedReceipt.id,
          categoryId: item.categoryId,
          condition: item.condition,
          quantity: item.quantity,
        });
        await queryRunner.manager.save(receiptItem);

        // Update or create stock
        let stock = await queryRunner.manager.findOne(WarehouseStock, {
          where: {
            categoryId: item.categoryId,
            condition: item.condition,
          },
        });

        if (!stock) {
          stock = queryRunner.manager.create(WarehouseStock, {
            categoryId: item.categoryId,
            condition: item.condition,
            quantity: 0,
          });
        }

        stock.quantity += item.quantity;
        await queryRunner.manager.save(stock);
      }

      // Update donation status
      donation.status = DonationStatus.RECEIVED;
      await queryRunner.manager.save(donation);

      await queryRunner.commitTransaction();
      return this.getReceipt(savedReceipt.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getReceipt(id: string) {
    const receipt = await this.receiptRepository.findOne({
      where: { id },
      relations: ['items', 'donation', 'createdBy'],
    });

    if (!receipt) {
      throw new ResourceNotFoundException('Receipt', id);
    }

    return receipt;
  }

  async listReceipts(page = 1, limit = 20) {
    const qb = this.receiptRepository
      .createQueryBuilder('receipt')
      .leftJoinAndSelect('receipt.items', 'items')
      .leftJoinAndSelect('items.category', 'category')
      .leftJoinAndSelect('receipt.donation', 'donation');

    const total = await qb.getCount();
    const skip = (page - 1) * limit;
    const receipts = await qb.skip(skip).take(limit).getMany();

    return {
      data: receipts,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async createAllocation(
    createdById: string,
    createDto: CreateAllocationDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Pre-fetch categories
      const categoryNames = [
        ...new Set(createDto.items.map((item) => item.category)),
      ];
      const categories = await queryRunner.manager.find(Category, {
        where: { name: In(categoryNames) },
      });
      const categoryMap = new Map(categories.map((c) => [c.name, c]));

      // Lock and check stock
      for (const item of createDto.items) {
        const categoryEntity = categoryMap.get(item.category);
        if (!categoryEntity) {
          throw new ConflictException(
            `Insufficient stock for ${item.category} (${item.condition}) - Category not found`,
          );
        }

        const stock = await queryRunner.manager.findOne(WarehouseStock, {
          where: {
            categoryId: categoryEntity.id,
            condition: item.condition,
          },
        });

        if (!stock || stock.quantity < item.quantity) {
          throw new ConflictException(
            `Insufficient stock for ${item.category} (${item.condition})`,
          );
        }
      }

      // Create allocation
      const allocation = queryRunner.manager.create(Allocation, {
        teamId: createDto.teamId,
        createdById,
        status: AllocationStatus.CREATED,
      });
      const savedAllocation = await queryRunner.manager.save(allocation);

      // Create allocation items & deduct stock
      for (const item of createDto.items) {
        const categoryEntity = categoryMap.get(item.category);
        if (!categoryEntity) continue;

        const allocationItem = queryRunner.manager.create(AllocationItem, {
          allocationId: savedAllocation.id,
          category: item.category,
          condition: item.condition,
          quantity: item.quantity,
        });
        await queryRunner.manager.save(allocationItem);

        // Deduct from stock
        const stock = await queryRunner.manager.findOne(WarehouseStock, {
          where: {
            categoryId: categoryEntity.id,
            condition: item.condition,
          },
        });

        if (stock) {
          stock.quantity -= item.quantity;
          await queryRunner.manager.save(stock);
        }
      }

      // Update donation status if provided
      if (createDto.donationId) {
        const donation = await queryRunner.manager.findOne(Donation, {
          where: { id: createDto.donationId },
        });

        if (donation) {
          donation.status = DonationStatus.ALLOCATED;
          await queryRunner.manager.save(donation);
        }
      }

      await queryRunner.commitTransaction();
      return this.getAllocation(savedAllocation.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getAllocation(id: string) {
    const allocation = await this.allocationRepository.findOne({
      where: { id },
      relations: ['items', 'team', 'createdBy'],
    });

    if (!allocation) {
      throw new ResourceNotFoundException('Allocation', id);
    }

    return allocation;
  }

  async listAllocations(query: ListAllocationsQueryDto) {
    const { teamId, status, page = 1, limit = 20 } = query;

    let qb = this.allocationRepository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.items', 'items');

    if (teamId) {
      qb = qb.where('allocation.teamId = :teamId', { teamId });
    }

    if (status) {
      qb = qb.andWhere('allocation.status = :status', { status });
    }

    const total = await qb.getCount();
    const skip = (page - 1) * limit;
    const allocations = await qb.skip(skip).take(limit).getMany();

    return {
      data: allocations,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async updateAllocationStatus(
    id: string,
    updateDto: UpdateAllocationStatusDto,
  ) {
    const allocation = await this.getAllocation(id);
    allocation.status = updateDto.status as AllocationStatus;
    return this.allocationRepository.save(allocation);
  }
}
