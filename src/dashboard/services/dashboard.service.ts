import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Account,
  Donation,
  DonationItem,
  DonationStatus,
  Event,
  EventStatus,
  EventType,
  ReplenishmentRequest,
  ReplenishmentRequestStatus,
  RescueRequest,
  RescueStatus,
  VolunteerRegistration,
  WarehouseStock,
} from '@/database/entities';
import { AdminDashboardOverviewDto } from '@/dashboard/dto';
import { StaffDashboardOverviewDto } from '@/dashboard/dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(RescueRequest)
    private readonly rescueRequestRepository: Repository<RescueRequest>,
    @InjectRepository(ReplenishmentRequest)
    private readonly replenishmentRequestRepository: Repository<ReplenishmentRequest>,
    @InjectRepository(WarehouseStock)
    private readonly warehouseStockRepository: Repository<WarehouseStock>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(DonationItem)
    private readonly donationItemRepository: Repository<DonationItem>,
    @InjectRepository(VolunteerRegistration)
    private readonly volunteerRegistrationRepository: Repository<VolunteerRegistration>,
  ) {}

  async getOverview(): Promise<AdminDashboardOverviewDto> {
    const [
      openEvents,
      pendingRescueRequests,
      pendingReplenishmentRequests,
      totalAccounts,
      activeAccounts,
      stockSummary,
    ] = await Promise.all([
      this.eventRepository.count({ where: { status: EventStatus.OPEN } }),
      this.rescueRequestRepository.count({ where: { status: RescueStatus.NEW } }),
      this.replenishmentRequestRepository.count({
        where: { status: ReplenishmentRequestStatus.PENDING },
      }),
      this.accountRepository.count(),
      this.accountRepository.count({ where: { isActive: true } }),
      this.warehouseStockRepository
        .createQueryBuilder('stock')
        .select('COALESCE(SUM(stock.quantity), 0)', 'totalStock')
        .getRawOne<{ totalStock: string | number | null }>(),
    ]);

    return {
      openEvents,
      pendingRequests: pendingRescueRequests + pendingReplenishmentRequests,
      pendingRequestBreakdown: {
        rescue: pendingRescueRequests,
        replenishment: pendingReplenishmentRequests,
      },
      totalStock: Number(stockSummary?.totalStock ?? 0),
      totalAccounts,
      activeAccounts,
    };
  }

  async getStaffOverview(): Promise<StaffDashboardOverviewDto> {
    const [
      pendingProducts,
      pendingVolunteerRegistrations,
      pendingRescueRequests,
      pendingReplenishmentRequests,
      stockSummary,
    ] = await Promise.all([
      this.donationItemRepository
        .createQueryBuilder('item')
        .innerJoin('item.donation', 'donation')
        .where('donation.status = :status', { status: DonationStatus.SUBMITTED })
        .andWhere('donation.deletedAt IS NULL')
        .getCount(),
      this.volunteerRegistrationRepository
        .createQueryBuilder('registration')
        .innerJoin('registration.event', 'event')
        .where('event.status = :status', { status: EventStatus.OPEN })
        .andWhere('event.type = :type', { type: EventType.VOLUNTEER })
        .getCount(),
      this.rescueRequestRepository.count({ where: { status: RescueStatus.NEW } }),
      this.replenishmentRequestRepository.count({
        where: { status: ReplenishmentRequestStatus.PENDING },
      }),
      this.warehouseStockRepository
        .createQueryBuilder('stock')
        .select('COALESCE(SUM(stock.quantity), 0)', 'totalStockItems')
        .getRawOne<{ totalStockItems: string | number | null }>(),
    ]);

    return {
      pendingProducts,
      pendingVolunteerRegistrations,
      pendingRescueRequests,
      pendingReplenishmentRequests,
      totalStockItems: Number(stockSummary?.totalStockItems ?? 0),
    };
  }
}