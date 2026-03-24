import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  In,
  MoreThanOrEqual,
  LessThanOrEqual,
  Between,
  IsNull,
} from 'typeorm';
import { Donation, DonationItem, DonationStatus, Category } from '@/database/entities';
import {
  CreateDonationDto,
  ApproveDonationDto,
  RejectDonationDto,
  ListDonationsQueryDto,
  BulkApproveDonationDto,
  BulkRejectDonationDto,
  BulkFilterDto,
} from '@/donations/dto';
import {
  ResourceNotFoundException,
  ForbiddenException,
  ConflictException,
} from '@/common/exceptions';
import { RealtimeNotificationService } from '@/common/services/realtime-notification.service';
import { StaffNotificationService } from '@/dashboard/services';

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(Donation)
    private donationRepository: Repository<Donation>,
    @InjectRepository(DonationItem)
    private donationItemRepository: Repository<DonationItem>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private realtimeNotificationService: RealtimeNotificationService,
    private staffNotificationService: StaffNotificationService,
  ) {}

  async createDonation(eventId: string, creatorId: string, createDto: CreateDonationDto) {
    const donation = this.donationRepository.create({
      eventId,
      creatorId,
      note: createDto.note,
    });

    const saved = await this.donationRepository.save(donation);

    // Create items
    const items: DonationItem[] = [];
    for (const itemDto of createDto.items) {
      let category = await this.categoryRepository.findOne({ where: { name: itemDto.category } });
      
      if (!category) {
        category = this.categoryRepository.create({ name: itemDto.category });
        await this.categoryRepository.save(category);
      }

      const item = this.donationItemRepository.create({
        donationId: saved.id,
        categoryId: category.id,
        name: itemDto.name,
        unit: itemDto.unit,
        expirationDate: itemDto.expirationDate ? new Date(itemDto.expirationDate) : undefined,
        quantity: itemDto.quantity,
        condition: itemDto.condition,
        imageUrls: itemDto.imageUrls,
        note: itemDto.note,
      });
      items.push(item);
    }

    await this.donationItemRepository.save(items);

    const pendingProductsCount = await this.donationItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.donation', 'donation')
      .where('donation.status = :status', { status: DonationStatus.SUBMITTED })
      .andWhere('donation.deletedAt IS NULL')
      .getCount();

    await this.staffNotificationService.createPendingDonationCreatedNotifications(
      saved,
      pendingProductsCount,
    );

    this.realtimeNotificationService.notifyPendingDonationCreated(
      saved,
      pendingProductsCount,
    );

    return this.getDonation(saved.id);
  }

  async getDonation(id: string) {
    const donation = await this.donationRepository.findOne({
      where: { id },
      relations: ['items', 'items.category', 'creator', 'creator.profile'],
    });

    if (!donation) {
      throw new ResourceNotFoundException('Donation', id);
    }

    return donation;
  }

  async listMyDonations(creatorId: string, page = 1, limit = 20) {
    const qb = this.donationRepository
      .createQueryBuilder('donation')
      .leftJoinAndSelect('donation.items', 'items')
      .leftJoinAndSelect('items.category', 'category')
      .leftJoinAndSelect('donation.creator', 'creator')
      .leftJoinAndSelect('creator.profile', 'creatorProfile')
      .where('donation.creatorId = :creatorId', { creatorId });

    const total = await qb.getCount();
    const skip = (page - 1) * limit;
    const donations = await qb.skip(skip).take(limit).getMany();

    return {
      data: donations,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async listDonations(query: ListDonationsQueryDto) {
    const {
      status,
      eventId,
      from,
      to,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'DESC',
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {}; // Use any to avoid complex type checking issues temporarily if Donation entity lacks full type safety for FindOptionsWhere
    // Ideally use FindOptionsWhere<Donation> but let's be pragmatic first.
    
    // Explicitly filter active donations because withDeleted: true makes find return deleted ones too
    where.deletedAt = IsNull();

    if (status) {
      where.status = status;
    }

    if (eventId) {
      where.eventId = eventId;
    }

    if (from || to) {
      if (from && to) {
        where.createdAt = Between(new Date(from), new Date(to));
      } else if (from) {
        where.createdAt = MoreThanOrEqual(new Date(from));
      } else if (to) {
        where.createdAt = LessThanOrEqual(new Date(to));
      }
    }

    // Using findAndCount to get both data and total count
    // Using FindOptionsWhere type would require importing it and ensuring compatibility, using 'any' for now to be safe with existing codebase structure.
    const [donations, total] = await this.donationRepository.findAndCount({
      where,
      relations: {
        event: true,
        items: {
          category: true,
        },
        creator: {
          profile: true,
        },
      },
      withDeleted: true, // Key fix: Allows loading soft-deleted relations (such as soft-deleted events)
      order: {
        [sortBy]: order,
      },
      skip,
      take: limit,
    });

    const data = donations.map((donation) => {
      const {
        id,
        creatorId,
        eventId,
        status,
        note,
        createdAt,
        updatedAt,
        deletedAt,
        items,
        creator,
        event,
      } = donation;
      const safeCreator = creator
        ? (({ passwordHash, ...creatorWithoutPassword }) => creatorWithoutPassword)(creator)
        : creator;

      return {
        id,
        creatorId,
        eventId,
        title: event?.title ?? null,
        status,
        note,
        createdAt,
        updatedAt,
        deletedAt,
        items,
        creator: safeCreator,
      };
    });

    return {
      data,
      meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    };
  }

  async approveDonation(id: string, approveDto: ApproveDonationDto) {
    const donation = await this.getDonation(id);

    if (donation.status !== DonationStatus.SUBMITTED) {
      throw new ConflictException('Only submitted donations can be approved');
    }

    donation.status = DonationStatus.APPROVED;
    return this.donationRepository.save(donation);
  }

  async rejectDonation(id: string, rejectDto: RejectDonationDto) {
    const donation = await this.getDonation(id);

    if (donation.status !== DonationStatus.SUBMITTED) {
      throw new ConflictException('Only submitted donations can be rejected');
    }

    donation.status = DonationStatus.REJECTED;
    return this.donationRepository.save(donation);
  }

  async bulkApprove(dto: BulkApproveDonationDto, filter?: BulkFilterDto) {
    let idsToUpdate: string[] = [];

    if (dto.ids && dto.ids.length > 0) {
      idsToUpdate = dto.ids;
    } else if (filter) {
      const qb = this.donationRepository.createQueryBuilder('donation')
        .select('donation.id')
        .where('donation.status = :status', { status: DonationStatus.SUBMITTED });
      
      if (filter.eventId) {
        qb.andWhere('donation.eventId = :eventId', { eventId: filter.eventId });
      }
      if (filter.creatorId) {
        qb.andWhere('donation.creatorId = :creatorId', { creatorId: filter.creatorId });
      }
      if (filter.from) {
        qb.andWhere('donation.createdAt >= :from', { from: new Date(filter.from) });
      }
      if (filter.to) {
        qb.andWhere('donation.createdAt <= :to', { to: new Date(filter.to) });
      }

      const donations = await qb.getMany();
      idsToUpdate = donations.map(d => d.id);
    }

    if (idsToUpdate.length === 0) {
      return { count: 0, ids: [] };
    }

    const result = await this.donationRepository.update(
      { id: In(idsToUpdate), status: DonationStatus.SUBMITTED },
      { status: DonationStatus.APPROVED }
    );

    return { count: result.affected || 0, ids: idsToUpdate };
  }

  async bulkReject(dto: BulkRejectDonationDto, filter?: BulkFilterDto) {
    let idsToUpdate: string[] = [];

    if (dto.ids && dto.ids.length > 0) {
      idsToUpdate = dto.ids;
    } else if (filter) {
      const qb = this.donationRepository.createQueryBuilder('donation')
        .select('donation.id')
        .where('donation.status = :status', { status: DonationStatus.SUBMITTED });
      
      if (filter.eventId) {
        qb.andWhere('donation.eventId = :eventId', { eventId: filter.eventId });
      }
      if (filter.creatorId) {
        qb.andWhere('donation.creatorId = :creatorId', { creatorId: filter.creatorId });
      }
      if (filter.from) {
        qb.andWhere('donation.createdAt >= :from', { from: new Date(filter.from) });
      }
      if (filter.to) {
        qb.andWhere('donation.createdAt <= :to', { to: new Date(filter.to) });
      }

      const donations = await qb.getMany();
      idsToUpdate = donations.map(d => d.id);
    }

    if (idsToUpdate.length === 0) {
      return { count: 0, ids: [] };
    }

    const result = await this.donationRepository.update(
      { id: In(idsToUpdate), status: DonationStatus.SUBMITTED },
      { status: DonationStatus.REJECTED }
    );

    return { count: result.affected || 0, ids: idsToUpdate };
  }
}

