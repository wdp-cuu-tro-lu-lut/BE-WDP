import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(Donation)
    private donationRepository: Repository<Donation>,
    @InjectRepository(DonationItem)
    private donationItemRepository: Repository<DonationItem>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
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
        quantity: itemDto.quantity,
        condition: itemDto.condition,
        imageUrls: itemDto.imageUrls,
        note: itemDto.note,
      });
      items.push(item);
    }

    await this.donationItemRepository.save(items);

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

    let qb = this.donationRepository.createQueryBuilder('donation')
      .leftJoinAndSelect('donation.items', 'items')
      .leftJoinAndSelect('items.category', 'category');

    if (status) {
      qb = qb.where('donation.status = :status', { status });
    }

    if (eventId) {
      qb = qb.andWhere('donation.eventId = :eventId', { eventId });
    }

    if (from) {
      qb = qb.andWhere('donation.createdAt >= :from', {
        from: new Date(from),
      });
    }

    if (to) {
      qb = qb.andWhere('donation.createdAt <= :to', { to: new Date(to) });
    }

    const total = await qb.getCount();
    const skip = (page - 1) * limit;
    const donations = await qb
      .orderBy(`donation.${sortBy}`, order)
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      data: donations,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
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

