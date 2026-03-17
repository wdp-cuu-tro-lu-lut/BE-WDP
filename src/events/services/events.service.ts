import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Event,
  EventStatus,
  EventType,
  VolunteerRegistration,
} from '@/database/entities';
import {
  CreateEventDto,
  UpdateEventDto,
  UpdateEventStatusDto,
  ListEventsQueryDto,
  VolunteerRegistrationDto,
} from '@/events/dto';
import {
  ResourceNotFoundException,
  ConflictException,
} from '@/common/exceptions';
import { RealtimeNotificationService } from '@/common/services/realtime-notification.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(VolunteerRegistration)
    private volunteerRegistrationRepository: Repository<VolunteerRegistration>,
    private realtimeNotificationService: RealtimeNotificationService,
  ) {}

  async createEvent(createEventDto: CreateEventDto) {
    const event = this.eventRepository.create(createEventDto);
    return this.eventRepository.save(event);
  }

  async getEvent(id: string) {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) {
      throw new ResourceNotFoundException('Event', id);
    }
    return event;
  }

  async listEvents(query: ListEventsQueryDto) {
    const {
      type,
      status,
      q,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'DESC',
    } = query;

    let qb = this.eventRepository.createQueryBuilder('event');

    if (type) {
      qb = qb.where('event.type = :type', { type });
    }

    if (status) {
      qb = qb.andWhere('event.status = :status', { status });
    }

    if (q) {
      qb = qb.andWhere('(event.title LIKE :q OR event.description LIKE :q)', {
        q: `%${q}%`,
      });
    }

    const total = await qb.getCount();

    const skip = (page - 1) * limit;
    const events = await qb
      .orderBy(`event.${sortBy}`, order)
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      data: events,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateEvent(id: string, updateEventDto: UpdateEventDto) {
    const event = await this.getEvent(id);
    Object.assign(event, updateEventDto);
    return this.eventRepository.save(event);
  }

  async updateEventStatus(id: string, statusDto: UpdateEventStatusDto) {
    const event = await this.getEvent(id);
    event.status = statusDto.status;
    return this.eventRepository.save(event);
  }

  async deleteEvent(id: string) {
    const event = await this.getEvent(id);
    return this.eventRepository.softRemove(event);
  }

  async registerVolunteer(
    eventId: string,
    accountId: string,
    registrationDto: VolunteerRegistrationDto,
  ) {
    const event = await this.getEvent(eventId);

    const existing = await this.volunteerRegistrationRepository.findOne({
      where: { eventId, accountId },
    });

    if (existing) {
      throw new ConflictException('Already registered for this event');
    }

    const registration = this.volunteerRegistrationRepository.create({
      eventId,
      accountId,
      note: registrationDto.note,
    });

    const savedRegistration = await this.volunteerRegistrationRepository.save(
      registration,
    );

    const pendingVolunteerRegistrations = await this.volunteerRegistrationRepository
      .createQueryBuilder('registration')
      .innerJoin('registration.event', 'event')
      .where('event.status = :status', { status: EventStatus.OPEN })
      .andWhere('event.type = :type', { type: EventType.VOLUNTEER })
      .getCount();

    this.realtimeNotificationService.notifyVolunteerRegistrationCreated(
      savedRegistration,
      pendingVolunteerRegistrations,
      event.title,
    );

    return savedRegistration;
  }

  async getEventVolunteers(eventId: string, page = 1, limit = 20) {
    await this.getEvent(eventId);

    const qb = this.volunteerRegistrationRepository
      .createQueryBuilder('vr')
      .leftJoinAndSelect('vr.account', 'account')
      .leftJoinAndSelect('account.profile', 'profile')
      .where('vr.eventId = :eventId', { eventId });

    const total = await qb.getCount();

    const skip = (page - 1) * limit;
    const registrations = await qb.skip(skip).take(limit).getMany();

    return {
      data: registrations.map(r => ({
        id: r.id,
        accountId: r.accountId,
        eventId: r.eventId,
        account: r.account,
        registeredAt: r.registeredAt,
      })),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
