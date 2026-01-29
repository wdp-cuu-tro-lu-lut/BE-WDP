import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Donation, DonationItem, DonationStatus } from '@/database/entities';
import {
  CreateDonationDto,
  ApproveDonationDto,
  RejectDonationDto,
  ListDonationsQueryDto,
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
  ) {}

  async createDonation(eventId: string, creatorId: string, createDto: CreateDonationDto) {
    const donation = this.donationRepository.create({
      eventId,
      creatorId,
      note: createDto.note,
    });

    const saved = await this.donationRepository.save(donation);

    // Create items
    const items = createDto.items.map(item =>
      this.donationItemRepository.create({
        donationId: saved.id,
        ...item,
      }),
    );

    await this.donationItemRepository.save(items);

    return this.getDonation(saved.id);
  }

  async getDonation(id: string) {
    const donation = await this.donationRepository.findOne({
      where: { id },
      relations: ['items', 'creator', 'creator.profile'],
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

    let qb = this.donationRepository.createQueryBuilder('donation').leftJoinAndSelect('donation.items', 'items');

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
}
