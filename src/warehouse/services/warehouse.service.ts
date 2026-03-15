import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import {
  Allocation,
  AllocationItem,
  AllocationStatus,
  AssignmentStatus,
  Category,
  Donation,
  DonationItem,
  DonationStatus,
  ReplenishmentRequest,
  ReplenishmentRequestItem,
  ReplenishmentRequestStatus,
  RescuePriority,
  RescueRequest,
  RescueStatus,
  RescueSupplyItemType,
  RescueSupplyOrder,
  RescueSupplyOrderItem,
  RescueSupplyOrderStatus,
  WarehouseReceipt,
  WarehouseReceiptType,
  WarehouseReceiptItem,
  WarehouseStock,
  WarehouseTransaction,
  WarehouseTransactionSource,
  WarehouseTransactionType,
} from '@/database/entities';
import { ItemCondition } from '@/database/entities/warehouse-stock.entity';
import {
  CompleteRescueSupplyOrderDto,
  CreateAllocationDto,
  CreateManualStockEntryDto,
  CreateReceiptDto,
  CreateRescueReplenishmentRequestDto,
  CreateRescueSupplyOrderDto,
  ListAllocationsQueryDto,
  ListRescueSupplyOrdersQueryDto,
  ListWarehouseTransactionsQueryDto,
  ReviewReplenishmentRequestDto,
  UpdateAllocationStatusDto,
} from '@/warehouse/dto';
import {
  ConflictException,
  ResourceNotFoundException,
} from '@/common/exceptions';

type SupplyFormula = {
  waterPerPerson: number;
  foodPerPerson: number;
  medicalKitPeopleDivisor: number;
};

type StockAvailabilityItem = {
  orderItemId: string;
  categoryId: string;
  categoryName: string;
  itemType: RescueSupplyItemType;
  requiredQuantity: number;
  dispatchedQuantity: number;
  availableQuantity: number;
  shortageQuantity: number;
  isEnough: boolean;
};

const PRIORITY_SUPPLY_FORMULA: Record<RescuePriority, SupplyFormula> = {
  [RescuePriority.LOW]: {
    waterPerPerson: 2,
    foodPerPerson: 2,
    medicalKitPeopleDivisor: 5,
  },
  [RescuePriority.MEDIUM]: {
    waterPerPerson: 3,
    foodPerPerson: 3,
    medicalKitPeopleDivisor: 4,
  },
  [RescuePriority.HIGH]: {
    waterPerPerson: 4,
    foodPerPerson: 4,
    medicalKitPeopleDivisor: 3,
  },
  [RescuePriority.CRITICAL]: {
    waterPerPerson: 5,
    foodPerPerson: 5,
    medicalKitPeopleDivisor: 2,
  },
};

const SUPPLY_CATEGORY_ALIASES: Record<RescueSupplyItemType, string[]> = {
  [RescueSupplyItemType.WATER]: ['Nước uống', 'Nước sạch', 'Nước'],
  [RescueSupplyItemType.FOOD]: ['Thực phẩm khô', 'Thực phẩm', 'Đồ ăn'],
  [RescueSupplyItemType.MEDICAL_KIT]: [
    'Thuốc men',
    'Thiết bị y tế',
    'Dụng cụ y tế',
    'Bộ dụng cụ y tế',
  ],
};

const STOCK_CONDITION_PRIORITY: ItemCondition[] = [
  ItemCondition.EXCELLENT,
  ItemCondition.GOOD,
  ItemCondition.FAIR,
  ItemCondition.POOR,
];

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
    @InjectRepository(RescueRequest)
    private rescueRequestRepository: Repository<RescueRequest>,
    @InjectRepository(RescueSupplyOrder)
    private rescueSupplyOrderRepository: Repository<RescueSupplyOrder>,
    @InjectRepository(RescueSupplyOrderItem)
    private rescueSupplyOrderItemRepository: Repository<RescueSupplyOrderItem>,
    @InjectRepository(ReplenishmentRequest)
    private replenishmentRequestRepository: Repository<ReplenishmentRequest>,
    @InjectRepository(ReplenishmentRequestItem)
    private replenishmentRequestItemRepository: Repository<ReplenishmentRequestItem>,
    @InjectRepository(WarehouseTransaction)
    private warehouseTransactionRepository: Repository<WarehouseTransaction>,
    private dataSource: DataSource,
  ) {}

  async listStocks(page = 1, limit = 20) {
    const qb = this.stockRepository
      .createQueryBuilder('stock')
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
      const receipt = queryRunner.manager.create(WarehouseReceipt, {
        donationId: donation.id,
        receiptType: WarehouseReceiptType.DONATION,
        createdById,
      });
      const savedReceipt = await queryRunner.manager.save(receipt);

      for (const item of donation.items) {
        const receiptItem = queryRunner.manager.create(WarehouseReceiptItem, {
          receiptId: savedReceipt.id,
          categoryId: item.categoryId,
          condition: item.condition,
          quantity: item.quantity,
        });
        await queryRunner.manager.save(receiptItem);

        let stock = await queryRunner.manager.findOne(WarehouseStock, {
          where: {
            categoryId: item.categoryId,
            condition: item.condition as ItemCondition,
          },
        });
        const balanceBefore = stock?.quantity ?? 0;

        if (!stock) {
          stock = queryRunner.manager.create(WarehouseStock, {
            categoryId: item.categoryId,
            condition: item.condition as ItemCondition,
            quantity: 0,
          });
        }

        stock.quantity += item.quantity;
        await queryRunner.manager.save(stock);

        await this.recordWarehouseTransaction(queryRunner.manager, {
          categoryId: item.categoryId,
          performedById: createdById,
          type: WarehouseTransactionType.IN,
          source: WarehouseTransactionSource.DONATION_RECEIPT,
          referenceId: savedReceipt.id,
          quantity: item.quantity,
          balanceBefore,
          balanceAfter: stock.quantity,
          note: `Receipt from donation ${donation.id}`,
        });
      }

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

  async createManualStockEntry(
    createdById: string,
    createDto: CreateManualStockEntryDto,
  ) {
    if (!createDto.items?.length) {
      throw new ConflictException('Manual stock entry must include at least one item');
    }

    const normalizedItems = this.mergeManualStockEntryItems(createDto.items);
    const categoryIds = normalizedItems.map((item) => item.categoryId);
    const categories = await this.categoryRepository.find({
      where: { id: In(categoryIds) },
    });
    const categoryMap = new Map(categories.map((category) => [category.id, category]));

    for (const item of normalizedItems) {
      if (!categoryMap.has(item.categoryId)) {
        throw new ResourceNotFoundException('Category', item.categoryId);
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const receipt = queryRunner.manager.create(WarehouseReceipt, {
        donationId: null,
        receiptType: WarehouseReceiptType.MANUAL,
        referenceCode: createDto.referenceCode?.trim() || null,
        note: createDto.note?.trim() || null,
        createdById,
      });
      const savedReceipt = await queryRunner.manager.save(receipt);

      for (const item of normalizedItems) {
        const receiptItem = queryRunner.manager.create(WarehouseReceiptItem, {
          receiptId: savedReceipt.id,
          categoryId: item.categoryId,
          condition: item.condition,
          quantity: item.quantity,
        });
        await queryRunner.manager.save(receiptItem);

        let stock = await queryRunner.manager.findOne(WarehouseStock, {
          where: {
            categoryId: item.categoryId,
            condition: item.condition,
          },
        });
        const balanceBefore = stock?.quantity ?? 0;

        if (!stock) {
          stock = queryRunner.manager.create(WarehouseStock, {
            categoryId: item.categoryId,
            condition: item.condition,
            quantity: 0,
          });
        }

        stock.quantity += item.quantity;
        await queryRunner.manager.save(stock);

        await this.recordWarehouseTransaction(queryRunner.manager, {
          categoryId: item.categoryId,
          performedById: createdById,
          type: WarehouseTransactionType.IN,
          source: WarehouseTransactionSource.MANUAL_STOCK_ENTRY,
          referenceId: savedReceipt.id,
          quantity: item.quantity,
          balanceBefore,
          balanceAfter: stock.quantity,
          note:
            createDto.note?.trim() ||
            createDto.referenceCode?.trim() ||
            `Manual warehouse receipt ${savedReceipt.id}`,
        });
      }

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
      relations: [
        'items',
        'items.category',
        'donation',
        'donation.creator',
        'donation.creator.profile',
        'donation.items',
        'donation.items.category',
        'createdBy',
        'createdBy.profile',
      ],
    });

    if (!receipt) {
      throw new ResourceNotFoundException('Receipt', id);
    }

    return this.serializeReceipt(receipt);
  }

  async listReceipts(page = 1, limit = 20) {
    const qb = this.receiptRepository
      .createQueryBuilder('receipt')
      .leftJoinAndSelect('receipt.items', 'items')
      .leftJoinAndSelect('items.category', 'category')
      .leftJoinAndSelect('receipt.donation', 'donation')
      .leftJoinAndSelect('donation.creator', 'donationCreator')
      .leftJoinAndSelect('donationCreator.profile', 'donationCreatorProfile')
      .leftJoinAndSelect('donation.items', 'donationItems')
      .leftJoinAndSelect('donationItems.category', 'donationItemCategory')
      .leftJoinAndSelect('receipt.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.profile', 'createdByProfile');

    const total = await qb.getCount();
    const skip = (page - 1) * limit;
    const receipts = await qb
      .orderBy('receipt.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      data: receipts.map((receipt) => this.serializeReceipt(receipt)),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  private serializeReceipt(receipt: WarehouseReceipt) {
    const donor = receipt.donation?.creator;
    const donationItems = [...(receipt.donation?.items ?? [])];

    const items = (receipt.items ?? []).map((item) => {
      const matchedDonationItem = this.matchDonationItemForReceiptItem(
        item,
        donationItems,
      );

      return {
        ...item,
        donationItemId: matchedDonationItem?.id ?? null,
        name: matchedDonationItem?.name ?? null,
        productName: matchedDonationItem?.name ?? null,
        unit: matchedDonationItem?.unit ?? null,
        categoryName:
          item.category?.name ?? matchedDonationItem?.category?.name ?? null,
      };
    });

    return {
      ...receipt,
      donor: donor
        ? {
            id: donor.id,
            fullName: donor.profile?.fullName ?? null,
            email: donor.email ?? null,
            phone: donor.phone ?? null,
          }
        : null,
      items,
    };
  }

  private mergeManualStockEntryItems(
    items: CreateManualStockEntryDto['items'],
  ) {
    const grouped = new Map<string, CreateManualStockEntryDto['items'][number]>();

    for (const item of items) {
      const key = `${item.categoryId}:${item.condition}`;
      const existing = grouped.get(key);

      if (existing) {
        existing.quantity += item.quantity;
        continue;
      }

      grouped.set(key, {
        categoryId: item.categoryId,
        condition: item.condition,
        quantity: item.quantity,
      });
    }

    return [...grouped.values()];
  }

  private matchDonationItemForReceiptItem(
    receiptItem: WarehouseReceiptItem,
    donationItems: DonationItem[],
  ) {
    const exactIndex = donationItems.findIndex(
      (item) =>
        item.categoryId === receiptItem.categoryId &&
        item.condition === receiptItem.condition &&
        item.quantity === receiptItem.quantity,
    );

    if (exactIndex >= 0) {
      return donationItems.splice(exactIndex, 1)[0];
    }

    const sameConditionIndex = donationItems.findIndex(
      (item) =>
        item.categoryId === receiptItem.categoryId &&
        item.condition === receiptItem.condition,
    );

    if (sameConditionIndex >= 0) {
      return donationItems.splice(sameConditionIndex, 1)[0];
    }

    const sameCategoryIndex = donationItems.findIndex(
      (item) => item.categoryId === receiptItem.categoryId,
    );

    if (sameCategoryIndex >= 0) {
      return donationItems.splice(sameCategoryIndex, 1)[0];
    }

    return null;
  }

  async createAllocation(createdById: string, createDto: CreateAllocationDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const categoryNames = [
        ...new Set(createDto.items.map((item) => item.category)),
      ];
      const categories = await queryRunner.manager.find(Category, {
        where: { name: In(categoryNames) },
      });
      const categoryMap = new Map(categories.map((category) => [category.name, category]));

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
            condition: item.condition as ItemCondition,
          },
        });

        if (!stock || stock.quantity < item.quantity) {
          throw new ConflictException(
            `Insufficient stock for ${item.category} (${item.condition})`,
          );
        }
      }

      const allocation = queryRunner.manager.create(Allocation, {
        teamId: createDto.teamId,
        createdById,
        status: AllocationStatus.CREATED,
        eventId: createDto.eventId,
      });
      const savedAllocation = await queryRunner.manager.save(allocation);

      for (const item of createDto.items) {
        const categoryEntity = categoryMap.get(item.category);
        if (!categoryEntity) {
          continue;
        }

        const allocationItem = queryRunner.manager.create(AllocationItem, {
          allocationId: savedAllocation.id,
          category: item.category,
          condition: item.condition,
          quantity: item.quantity,
        });
        await queryRunner.manager.save(allocationItem);

        const stock = await queryRunner.manager.findOne(WarehouseStock, {
          where: {
            categoryId: categoryEntity.id,
            condition: item.condition as ItemCondition,
          },
        });

        if (stock) {
          const balanceBefore = stock.quantity;
          stock.quantity -= item.quantity;
          await queryRunner.manager.save(stock);

          await this.recordWarehouseTransaction(queryRunner.manager, {
            categoryId: categoryEntity.id,
            performedById: createdById,
            type: WarehouseTransactionType.OUT,
            source: WarehouseTransactionSource.ALLOCATION_DISPATCH,
            referenceId: savedAllocation.id,
            quantity: item.quantity,
            balanceBefore,
            balanceAfter: stock.quantity,
            note: `Allocation for team ${createDto.teamId}`,
          });
        }
      }

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
    const { teamId, eventId, status, page = 1, limit = 20 } = query;

    let qb = this.allocationRepository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.items', 'items');

    if (teamId) {
      qb = qb.andWhere('allocation.teamId = :teamId', { teamId });
    }

    if (eventId) {
      qb = qb.andWhere('allocation.eventId = :eventId', { eventId });
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

  async createRescueSupplyOrder(
    createdById: string,
    createDto: CreateRescueSupplyOrderDto,
  ) {
    const existing = await this.rescueSupplyOrderRepository.findOne({
      where: {
        rescueRequestId: createDto.rescueRequestId,
        status: In([
          RescueSupplyOrderStatus.PLANNED,
          RescueSupplyOrderStatus.INSUFFICIENT,
          RescueSupplyOrderStatus.READY,
          RescueSupplyOrderStatus.DISPATCHED,
        ]),
      },
    });

    if (existing) {
      throw new ConflictException(
        'Rescue request already has an active supply order',
      );
    }

    const rescueRequest = await this.rescueRequestRepository.findOne({
      where: { id: createDto.rescueRequestId },
      relations: ['assignments', 'assignments.team'],
    });

    if (!rescueRequest) {
      throw new ResourceNotFoundException(
        'Rescue request',
        createDto.rescueRequestId,
      );
    }

    if (
      ![
        RescueStatus.REVIEWED,
        RescueStatus.ASSIGNED,
        RescueStatus.ACCEPTED,
        RescueStatus.IN_PROGRESS,
      ].includes(rescueRequest.status)
    ) {
      throw new ConflictException(
        'Rescue request must be reviewed and assigned before creating a supply order',
      );
    }

    const estimatedPeople =
      createDto.estimatedPeople ?? rescueRequest.estimatedPeople ?? 0;

    if (estimatedPeople < 1) {
      throw new ConflictException(
        'Estimated people must be at least 1 to generate a supply order',
      );
    }

    const activeAssignments = (rescueRequest.assignments ?? []).filter(
      (assignment) =>
        ![AssignmentStatus.CANCELED, AssignmentStatus.DECLINED].includes(
          assignment.status,
        ),
    );

    if (activeAssignments.length === 0) {
      throw new ConflictException(
        'Rescue request must have at least one assigned team before creating a supply order',
      );
    }

    const supplyCategories = await this.resolveSupplyCategories();
    const formula = PRIORITY_SUPPLY_FORMULA[rescueRequest.priority];
    const totalRescuers = activeAssignments.reduce(
      (sum, assignment) => sum + (assignment.team?.teamSize ?? 0),
      0,
    );

    const order = this.rescueSupplyOrderRepository.create({
      rescueRequestId: rescueRequest.id,
      createdById,
      estimatedPeople,
      priority: rescueRequest.priority,
      totalRescuers,
      note: createDto.note ?? null,
      status: RescueSupplyOrderStatus.PLANNED,
    });
    const savedOrder = await this.rescueSupplyOrderRepository.save(order);

    const items = this.buildSupplyOrderItems(
      savedOrder.id,
      estimatedPeople,
      formula,
      supplyCategories,
    );
    await this.rescueSupplyOrderItemRepository.save(items);

    return this.getRescueSupplyOrder(savedOrder.id);
  }

  async listRescueSupplyOrders(query: ListRescueSupplyOrdersQueryDto) {
    const { rescueRequestId, status, page = 1, limit = 20 } = query;

    let qb = this.rescueSupplyOrderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.category', 'category')
      .leftJoinAndSelect('order.rescueRequest', 'rescueRequest')
      .leftJoinAndSelect('rescueRequest.assignments', 'assignments')
      .leftJoinAndSelect('assignments.team', 'team')
      .leftJoinAndSelect('order.replenishmentRequests', 'replenishmentRequests')
      .distinct(true);

    if (rescueRequestId) {
      qb = qb.andWhere('order.rescueRequestId = :rescueRequestId', {
        rescueRequestId,
      });
    }

    if (status) {
      qb = qb.andWhere('order.status = :status', { status });
    }

    const total = await qb.getCount();
    const data = await qb
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: await Promise.all(
        data.map((order) => this.serializeRescueSupplyOrder(order)),
      ),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getRescueSupplyOrder(id: string) {
    const order = await this.getRescueSupplyOrderEntity(id);
    return this.serializeRescueSupplyOrder(order);
  }

  async checkRescueSupplyOrderStock(id: string) {
    const order = await this.getRescueSupplyOrderEntity(id);

    if (
      [
        RescueSupplyOrderStatus.DISPATCHED,
        RescueSupplyOrderStatus.COMPLETED,
        RescueSupplyOrderStatus.CANCELED,
      ].includes(order.status)
    ) {
      throw new ConflictException(
        'Cannot re-check stock for a dispatched, completed, or canceled order',
      );
    }

    const availability = await this.getStockAvailabilityForOrder(order);

    order.status = availability.allSufficient
      ? RescueSupplyOrderStatus.READY
      : RescueSupplyOrderStatus.INSUFFICIENT;
    order.lastStockCheckAt = new Date();

    await this.updateRescueSupplyOrder(
      order.id,
      {
        status: order.status,
        lastStockCheckAt: order.lastStockCheckAt,
      },
      this.dataSource.manager,
    );
    await this.syncItemShortages(this.dataSource.manager, order.items, availability.items);

    return this.getRescueSupplyOrder(id);
  }

  async dispatchRescueSupplyOrder(id: string, performedById: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(RescueSupplyOrder, {
        where: { id },
        relations: ['items', 'items.category', 'rescueRequest'],
      });

      if (!order) {
        throw new ResourceNotFoundException('Rescue supply order', id);
      }

      if (order.status === RescueSupplyOrderStatus.DISPATCHED) {
        throw new ConflictException('Supply order has already been dispatched');
      }

      if (order.status === RescueSupplyOrderStatus.COMPLETED) {
        throw new ConflictException('Completed supply order cannot be dispatched again');
      }

      const availability = await this.getStockAvailabilityForOrder(
        order,
        queryRunner.manager,
      );

      if (!availability.allSufficient) {
        const summary = availability.items
          .filter((item) => item.shortageQuantity > 0)
          .map((item) => `${item.categoryName}: thiếu ${item.shortageQuantity}`)
          .join('; ');

        throw new ConflictException(`Insufficient stock: ${summary}`);
      }

      for (const item of order.items) {
        const remainingToDispatch = item.requestedQuantity - item.dispatchedQuantity;
        if (remainingToDispatch <= 0) {
          continue;
        }

        const stocks = await this.getStocksForCategory(
          queryRunner.manager,
          item.categoryId,
        );
        const balanceBefore = stocks.reduce(
          (sum, stock) => sum + stock.quantity,
          0,
        );
        let remaining = remainingToDispatch;

        for (const stock of stocks) {
          if (remaining <= 0) {
            break;
          }

          const quantity = Math.min(stock.quantity, remaining);
          if (quantity <= 0) {
            continue;
          }

          stock.quantity -= quantity;
          remaining -= quantity;
          await queryRunner.manager.save(stock);
        }

        if (remaining > 0) {
          throw new ConflictException(
            `Insufficient stock while dispatching ${item.category?.name ?? item.categoryId}`,
          );
        }

        item.dispatchedQuantity += remainingToDispatch;
        item.lastShortageQuantity = 0;
        await queryRunner.manager.save(item);

        await this.recordWarehouseTransaction(queryRunner.manager, {
          categoryId: item.categoryId,
          performedById,
          type: WarehouseTransactionType.OUT,
          source: WarehouseTransactionSource.RESCUE_DISPATCH,
          referenceId: order.id,
          quantity: remainingToDispatch,
          balanceBefore,
          balanceAfter: balanceBefore - remainingToDispatch,
          note: `Dispatch for rescue request ${order.rescueRequestId}`,
        });
      }

      order.status = RescueSupplyOrderStatus.DISPATCHED;
      order.dispatchedAt = new Date();
      order.lastStockCheckAt = new Date();
      await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();
      return this.getRescueSupplyOrder(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async createReplenishmentRequest(
    orderId: string,
    createdById: string,
    createDto: CreateRescueReplenishmentRequestDto,
  ) {
    const order = await this.getRescueSupplyOrderEntity(orderId);

    if (
      [RescueSupplyOrderStatus.DISPATCHED, RescueSupplyOrderStatus.COMPLETED].includes(
        order.status,
      )
    ) {
      throw new ConflictException(
        'Cannot create replenishment request for an already dispatched or completed order',
      );
    }

    const pendingRequest = (order.replenishmentRequests ?? []).find(
      (request) => request.status === ReplenishmentRequestStatus.PENDING,
    );

    if (pendingRequest) {
      throw new ConflictException(
        'There is already a pending replenishment request for this order',
      );
    }

    const availability = await this.getStockAvailabilityForOrder(order);
    const shortages = availability.items.filter(
      (item) => item.shortageQuantity > 0,
    );

    if (shortages.length === 0) {
      throw new ConflictException('Warehouse is sufficient for this supply order');
    }

    const request = this.replenishmentRequestRepository.create({
      orderId,
      createdById,
      note: createDto.note ?? null,
      status: ReplenishmentRequestStatus.PENDING,
      reviewedById: null,
      decisionNote: null,
      reviewedAt: null,
    });
    const savedRequest = await this.replenishmentRequestRepository.save(request);

    const requestItems = shortages.map((item) =>
      this.replenishmentRequestItemRepository.create({
        requestId: savedRequest.id,
        categoryId: item.categoryId,
        itemType: item.itemType,
        requestedQuantity: item.shortageQuantity,
        approvedQuantity: 0,
        condition: ItemCondition.EXCELLENT,
      }),
    );
    await this.replenishmentRequestItemRepository.save(requestItems);

    order.status = RescueSupplyOrderStatus.INSUFFICIENT;
    order.lastStockCheckAt = new Date();
    await this.updateRescueSupplyOrder(
      order.id,
      {
        status: order.status,
        lastStockCheckAt: order.lastStockCheckAt,
      },
      this.dataSource.manager,
    );
    await this.syncItemShortages(this.dataSource.manager, order.items, availability.items);

    return this.getReplenishmentRequest(savedRequest.id);
  }

  async reviewReplenishmentRequest(
    id: string,
    reviewedById: string,
    reviewDto: ReviewReplenishmentRequestDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const request = await queryRunner.manager.findOne(ReplenishmentRequest, {
        where: { id },
        relations: ['items', 'items.category', 'order', 'order.items'],
      });

      if (!request) {
        throw new ResourceNotFoundException('Replenishment request', id);
      }

      if (request.status !== ReplenishmentRequestStatus.PENDING) {
        throw new ConflictException('Replenishment request has already been reviewed');
      }

      request.reviewedById = reviewedById;
      request.reviewedAt = new Date();
      request.decisionNote = reviewDto.decisionNote ?? null;

      if (!reviewDto.approved) {
        request.status = ReplenishmentRequestStatus.REJECTED;
        await queryRunner.manager.save(request);
        await queryRunner.commitTransaction();
        return this.getReplenishmentRequest(id);
      }

      const approvals = new Map(
        (reviewDto.items ?? []).map((item) => [item.itemId, item]),
      );

      for (const item of request.items) {
        const approval = approvals.get(item.id);
        const approvedQuantity = approval?.approvedQuantity ?? item.requestedQuantity;
        const condition = approval?.condition ?? item.condition;

        if (approvedQuantity < 0) {
          throw new ConflictException('Approved quantity cannot be negative');
        }

        item.approvedQuantity = approvedQuantity;
        item.condition = condition;
        await queryRunner.manager.save(item);

        if (approvedQuantity === 0) {
          continue;
        }

        let stock = await queryRunner.manager.findOne(WarehouseStock, {
          where: { categoryId: item.categoryId, condition },
        });
        const balanceBefore = stock?.quantity ?? 0;

        if (!stock) {
          stock = queryRunner.manager.create(WarehouseStock, {
            categoryId: item.categoryId,
            condition,
            quantity: 0,
          });
        }

        stock.quantity += approvedQuantity;
        await queryRunner.manager.save(stock);

        await this.recordWarehouseTransaction(queryRunner.manager, {
          categoryId: item.categoryId,
          performedById: reviewedById,
          type: WarehouseTransactionType.IN,
          source: WarehouseTransactionSource.MANUAL_REPLENISHMENT,
          referenceId: request.id,
          quantity: approvedQuantity,
          balanceBefore,
          balanceAfter: stock.quantity,
          note:
            reviewDto.decisionNote ??
            `Approved replenishment for rescue supply order ${request.orderId}`,
        });
      }

      request.status = ReplenishmentRequestStatus.APPROVED;
      await queryRunner.manager.save(request);

      const availability = await this.getStockAvailabilityForOrder(
        request.order,
        queryRunner.manager,
      );
      request.order.status = availability.allSufficient
        ? RescueSupplyOrderStatus.READY
        : RescueSupplyOrderStatus.INSUFFICIENT;
      request.order.lastStockCheckAt = new Date();
      await this.updateRescueSupplyOrder(
        request.order.id,
        {
          status: request.order.status,
          lastStockCheckAt: request.order.lastStockCheckAt,
        },
        queryRunner.manager,
      );
      await this.syncItemShortages(
        queryRunner.manager,
        request.order.items,
        availability.items,
      );

      await queryRunner.commitTransaction();
      return this.getReplenishmentRequest(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async completeRescueSupplyOrder(
    id: string,
    performedById: string,
    completeDto: CompleteRescueSupplyOrderDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(RescueSupplyOrder, {
        where: { id },
        relations: ['items', 'items.category'],
      });

      if (!order) {
        throw new ResourceNotFoundException('Rescue supply order', id);
      }

      if (order.status !== RescueSupplyOrderStatus.DISPATCHED) {
        throw new ConflictException(
          'Only dispatched rescue supply orders can be completed',
        );
      }

      const returnMap = new Map(
        (completeDto.items ?? []).map((item) => [item.orderItemId, item]),
      );

      for (const item of order.items) {
        const returned = returnMap.get(item.id);
        if (!returned || returned.returnedQuantity === 0) {
          continue;
        }

        const remainingReturnable = item.dispatchedQuantity - item.returnedQuantity;

        if (returned.returnedQuantity > remainingReturnable) {
          throw new ConflictException(
            `Returned quantity exceeds dispatched quantity for ${item.category?.name ?? item.categoryId}`,
          );
        }

        const condition = returned.condition ?? ItemCondition.GOOD;
        let stock = await queryRunner.manager.findOne(WarehouseStock, {
          where: { categoryId: item.categoryId, condition },
        });
        const balanceBefore = stock?.quantity ?? 0;

        if (!stock) {
          stock = queryRunner.manager.create(WarehouseStock, {
            categoryId: item.categoryId,
            condition,
            quantity: 0,
          });
        }

        stock.quantity += returned.returnedQuantity;
        await queryRunner.manager.save(stock);

        item.returnedQuantity += returned.returnedQuantity;
        await queryRunner.manager.save(item);

        await this.recordWarehouseTransaction(queryRunner.manager, {
          categoryId: item.categoryId,
          performedById,
          type: WarehouseTransactionType.IN,
          source: WarehouseTransactionSource.RESCUE_RETURN,
          referenceId: order.id,
          quantity: returned.returnedQuantity,
          balanceBefore,
          balanceAfter: stock.quantity,
          note:
            completeDto.note ??
            `Returned surplus from rescue supply order ${order.id}`,
        });
      }

      order.status = RescueSupplyOrderStatus.COMPLETED;
      order.completedAt = new Date();
      if (completeDto.note !== undefined) {
        order.note = completeDto.note;
      }
      await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();
      return this.getRescueSupplyOrder(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async returnDispatchedRescueOrderForIncident(
    rescueRequestId: string,
    performedById: string,
    incidentNote: string,
    manager?: EntityManager,
  ) {
    if (manager) {
      return this.returnDispatchedRescueOrderForIncidentWithManager(
        manager,
        rescueRequestId,
        performedById,
        incidentNote,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await this.returnDispatchedRescueOrderForIncidentWithManager(
        queryRunner.manager,
        rescueRequestId,
        performedById,
        incidentNote,
      );
      await queryRunner.commitTransaction();
      return order;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async listTransactions(query: ListWarehouseTransactionsQueryDto) {
    const {
      source,
      type,
      categoryId,
      from,
      to,
      page = 1,
      limit = 20,
    } = query;

    let qb = this.warehouseTransactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.category', 'category')
      .leftJoinAndSelect('transaction.performedBy', 'performedBy');

    if (source) {
      qb = qb.andWhere('transaction.source = :source', { source });
    }

    if (type) {
      qb = qb.andWhere('transaction.type = :type', { type });
    }

    if (categoryId) {
      qb = qb.andWhere('transaction.categoryId = :categoryId', { categoryId });
    }

    if (from) {
      qb = qb.andWhere('transaction.createdAt >= :from', {
        from: new Date(from),
      });
    }

    if (to) {
      qb = qb.andWhere('transaction.createdAt <= :to', {
        to: new Date(to),
      });
    }

    const total = await qb.getCount();
    const data = await qb
      .orderBy('transaction.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  private buildSupplyOrderItems(
    orderId: string,
    estimatedPeople: number,
    formula: SupplyFormula,
    categories: Map<RescueSupplyItemType, Category>,
  ) {
    return [
      this.rescueSupplyOrderItemRepository.create({
        orderId,
        categoryId: categories.get(RescueSupplyItemType.WATER)!.id,
        itemType: RescueSupplyItemType.WATER,
        requestedQuantity: estimatedPeople * formula.waterPerPerson,
      }),
      this.rescueSupplyOrderItemRepository.create({
        orderId,
        categoryId: categories.get(RescueSupplyItemType.FOOD)!.id,
        itemType: RescueSupplyItemType.FOOD,
        requestedQuantity: estimatedPeople * formula.foodPerPerson,
      }),
      this.rescueSupplyOrderItemRepository.create({
        orderId,
        categoryId: categories.get(RescueSupplyItemType.MEDICAL_KIT)!.id,
        itemType: RescueSupplyItemType.MEDICAL_KIT,
        requestedQuantity: Math.ceil(
          estimatedPeople / formula.medicalKitPeopleDivisor,
        ),
      }),
    ];
  }

  private async resolveSupplyCategories(
    manager: EntityManager = this.dataSource.manager,
  ) {
    const requiredNames = [
      ...new Set(Object.values(SUPPLY_CATEGORY_ALIASES).flat()),
    ];
    const categories = await manager.find(Category, {
      where: { name: In(requiredNames) },
    });
    const categoryByName = new Map(
      categories.map((category) => [this.normalizeName(category.name), category]),
    );
    const resolved = new Map<RescueSupplyItemType, Category>();

    for (const [itemType, aliases] of Object.entries(
      SUPPLY_CATEGORY_ALIASES,
    ) as [RescueSupplyItemType, string[]][]) {
      const category = aliases
        .map((alias) => categoryByName.get(this.normalizeName(alias)))
        .find(Boolean);

      if (!category) {
        throw new ConflictException(
          `Missing category mapping for ${itemType}. Expected one of: ${aliases.join(', ')}`,
        );
      }

      resolved.set(itemType, category);
    }

    return resolved;
  }

  private async getRescueSupplyOrderEntity(id: string) {
    const order = await this.rescueSupplyOrderRepository.findOne({
      where: { id },
      relations: [
        'items',
        'items.category',
        'rescueRequest',
        'rescueRequest.assignments',
        'rescueRequest.assignments.team',
        'replenishmentRequests',
      ],
    });

    if (!order) {
      throw new ResourceNotFoundException('Rescue supply order', id);
    }

    return order;
  }

  private async getReplenishmentRequest(id: string) {
    const request = await this.replenishmentRequestRepository.findOne({
      where: { id },
      relations: ['items', 'items.category', 'order', 'order.rescueRequest'],
    });

    if (!request) {
      throw new ResourceNotFoundException('Replenishment request', id);
    }

    return request;
  }

  private async returnDispatchedRescueOrderForIncidentWithManager(
    manager: EntityManager,
    rescueRequestId: string,
    performedById: string,
    incidentNote: string,
  ) {
    const order = await manager.findOne(RescueSupplyOrder, {
      where: {
        rescueRequestId,
        status: RescueSupplyOrderStatus.DISPATCHED,
      },
      relations: ['items', 'items.category'],
      order: { createdAt: 'DESC' },
    });

    if (!order) {
      return null;
    }

    for (const item of order.items) {
      const remainingReturnable = item.dispatchedQuantity - item.returnedQuantity;

      if (remainingReturnable <= 0) {
        continue;
      }

      let stock = await manager.findOne(WarehouseStock, {
        where: {
          categoryId: item.categoryId,
          condition: ItemCondition.GOOD,
        },
      });
      const balanceBefore = stock?.quantity ?? 0;

      if (!stock) {
        stock = manager.create(WarehouseStock, {
          categoryId: item.categoryId,
          condition: ItemCondition.GOOD,
          quantity: 0,
        });
      }

      stock.quantity += remainingReturnable;
      await manager.save(stock);

      item.returnedQuantity += remainingReturnable;
      await manager.save(item);

      await this.recordWarehouseTransaction(manager, {
        categoryId: item.categoryId,
        performedById,
        type: WarehouseTransactionType.IN,
        source: WarehouseTransactionSource.RESCUE_RETURN,
        referenceId: order.id,
        quantity: remainingReturnable,
        balanceBefore,
        balanceAfter: stock.quantity,
        note: `Incident return for rescue request ${rescueRequestId}: ${incidentNote}`,
      });
    }

    order.status = RescueSupplyOrderStatus.COMPLETED;
    order.completedAt = new Date();
    order.note = `Incident return: ${incidentNote}`;
    await manager.save(order);

    return this.getRescueSupplyOrder(order.id);
  }

  private async serializeRescueSupplyOrder(order: RescueSupplyOrder) {
    const availability = await this.getStockAvailabilityForOrder(order);
    const teams = (order.rescueRequest?.assignments ?? [])
      .filter(
        (assignment) =>
          ![AssignmentStatus.CANCELED, AssignmentStatus.DECLINED].includes(
            assignment.status,
          ),
      )
      .map((assignment) => ({
        assignmentId: assignment.id,
        teamId: assignment.teamId,
        teamName: assignment.team?.name ?? null,
        teamSize: assignment.team?.teamSize ?? 0,
        status: assignment.status,
        respondedAt: assignment.respondedAt,
      }));

    return {
      ...order,
      rescueRequestId: order.rescueRequestId,
      affectedPeople: order.estimatedPeople,
      damageLevel: order.priority,
      teams,
      totalResponders: order.totalRescuers,
      stockCheck: availability,
    };
  }

  private async getStockAvailabilityForOrder(
    order: Pick<RescueSupplyOrder, 'items'> & { items: RescueSupplyOrderItem[] },
    manager: EntityManager = this.dataSource.manager,
  ) {
    const categoryIds = order.items.map((item) => item.categoryId);
    const stocks = categoryIds.length
      ? await manager.find(WarehouseStock, {
          where: { categoryId: In(categoryIds) },
        })
      : [];

    const stockByCategory = new Map<string, number>();
    for (const stock of stocks) {
      stockByCategory.set(
        stock.categoryId,
        (stockByCategory.get(stock.categoryId) ?? 0) + stock.quantity,
      );
    }

    const items: StockAvailabilityItem[] = order.items.map((item) => {
      const availableQuantity = stockByCategory.get(item.categoryId) ?? 0;
      const requiredQuantity = Math.max(
        item.requestedQuantity - item.dispatchedQuantity,
        0,
      );
      const shortageQuantity = Math.max(requiredQuantity - availableQuantity, 0);

      return {
        orderItemId: item.id,
        categoryId: item.categoryId,
        categoryName: item.category?.name ?? item.categoryId,
        itemType: item.itemType,
        requiredQuantity,
        dispatchedQuantity: item.dispatchedQuantity,
        availableQuantity,
        shortageQuantity,
        isEnough: shortageQuantity === 0,
      };
    });

    return {
      allSufficient: items.every((item) => item.isEnough),
      items,
    };
  }

  private async syncItemShortages(
    manager: EntityManager,
    items: RescueSupplyOrderItem[],
    availabilityItems: StockAvailabilityItem[],
  ) {
    const shortageMap = new Map(
      availabilityItems.map((item) => [item.orderItemId, item.shortageQuantity]),
    );

    for (const item of items) {
      item.lastShortageQuantity = shortageMap.get(item.id) ?? 0;
      await manager.save(item);
    }
  }

  private async getStocksForCategory(
    manager: EntityManager,
    categoryId: string,
  ) {
    const stocks = await manager.find(WarehouseStock, {
      where: { categoryId },
    });

    return stocks.sort(
      (left, right) =>
        STOCK_CONDITION_PRIORITY.indexOf(left.condition) -
        STOCK_CONDITION_PRIORITY.indexOf(right.condition),
    );
  }

  private async recordWarehouseTransaction(
    manager: EntityManager,
    input: {
      categoryId: string;
      performedById: string | null;
      type: WarehouseTransactionType;
      source: WarehouseTransactionSource;
      referenceId: string;
      quantity: number;
      balanceBefore: number;
      balanceAfter: number;
      note?: string | null;
    },
  ) {
    const transaction = manager.create(WarehouseTransaction, {
      ...input,
      note: input.note ?? null,
    });

    await manager.save(transaction);
  }

  private async updateRescueSupplyOrder(
    orderId: string,
    updates: Partial<RescueSupplyOrder>,
    manager: EntityManager = this.dataSource.manager,
  ) {
    await manager.update(RescueSupplyOrder, { id: orderId }, updates);
  }

  private normalizeName(value: string) {
    return value.trim().toLowerCase();
  }
}