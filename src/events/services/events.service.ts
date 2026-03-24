import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
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

  async exportEventVolunteersExcel(eventId: string) {
    const event = await this.getEvent(eventId);

    const registrations = await this.volunteerRegistrationRepository
      .createQueryBuilder('vr')
      .leftJoinAndSelect('vr.account', 'account')
      .leftJoinAndSelect('account.profile', 'profile')
      .where('vr.eventId = :eventId', { eventId })
      .orderBy('vr.registeredAt', 'ASC')
      .getMany();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GitHub Copilot';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.subject = `Danh sách tình nguyện viên - ${event.title}`;
    workbook.title = `Đăng ký tình nguyện viên cho ${event.title}`;

    const infoSheet = workbook.addWorksheet('Thông tin sự kiện', {
      views: [{ state: 'frozen', ySplit: 4 }],
    });
    const volunteerSheet = workbook.addWorksheet('Danh sách TNV', {
      views: [{ state: 'frozen', ySplit: 5 }],
    });

    this.buildEventInfoSheet(infoSheet, event, registrations.length);
    this.buildVolunteerSheet(volunteerSheet, event, registrations);

    const fileName = `danh-sách-tình-nguyện-viên-${this.buildReadableFileName(event.title)}-${event.id.slice(0, 8)}.xlsx`;
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    return {
      buffer,
      fileName,
    };
  }

  private buildEventInfoSheet(
    sheet: ExcelJS.Worksheet,
    event: Event,
    volunteerCount: number,
  ) {
    sheet.columns = [
      { width: 28 },
      { width: 42 },
      { width: 24 },
      { width: 28 },
    ];

    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = 'DANH SÁCH TÌNH NGUYỆN VIÊN THEO SỰ KIỆN';
    sheet.getCell('A1').font = {
      bold: true,
      size: 18,
      color: { argb: 'FFFFFFFF' },
    };
    sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'C2410C' },
    };
    sheet.getRow(1).height = 28;

    sheet.mergeCells('A2:D2');
    sheet.getCell('A2').value = event.title;
    sheet.getCell('A2').font = { bold: true, size: 14, color: { argb: '7C2D12' } };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    const infoRows: Array<[string, string]> = [
      ['Mã sự kiện', event.id],
      ['Loại sự kiện', this.getEventTypeLabel(event.type)],
      ['Trạng thái', this.getEventStatusLabel(event.status)],
      ['Thời gian bắt đầu', this.formatDateTime(event.startDate)],
      ['Thời gian kết thúc', this.formatDateTime(event.endDate)],
      ['Địa điểm', event.location || 'Chưa cập nhật'],
      ['Mô tả', event.description || 'Không có mô tả'],
      ['Tổng số tình nguyện viên', String(volunteerCount)],
      ['Thời gian xuất file', this.formatDateTime(new Date())],
    ];

    let rowIndex = 4;
    for (const [label, value] of infoRows) {
      sheet.getCell(`A${rowIndex}`).value = label;
      sheet.getCell(`A${rowIndex}`).font = { bold: true, color: { argb: '7C2D12' } };
      sheet.getCell(`A${rowIndex}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEDD5' },
      };

      sheet.mergeCells(`B${rowIndex}:D${rowIndex}`);
      sheet.getCell(`B${rowIndex}`).value = value;
      sheet.getCell(`B${rowIndex}`).alignment = { wrapText: true, vertical: 'top' };

      for (const cellAddress of [`A${rowIndex}`, `B${rowIndex}`]) {
        sheet.getCell(cellAddress).border = this.getThinBorder();
      }

      rowIndex += 1;
    }
  }

  private buildVolunteerSheet(
    sheet: ExcelJS.Worksheet,
    event: Event,
    registrations: VolunteerRegistration[],
  ) {
    sheet.columns = [
      { header: 'STT', key: 'index', width: 8 },
      { header: 'Họ và tên', key: 'fullName', width: 28 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Số điện thoại', key: 'phone', width: 18 },
      { header: 'Địa chỉ', key: 'address', width: 34 },
      { header: 'Vai trò tài khoản', key: 'role', width: 18 },
      { header: 'Trạng thái tài khoản', key: 'isActive', width: 18 },
      { header: 'Ghi chú đăng ký', key: 'note', width: 28 },
      { header: 'Thời gian đăng ký', key: 'registeredAt', width: 24 },
      { header: 'Mã đăng ký', key: 'registrationId', width: 38 },
    ];

    sheet.mergeCells('A1:J1');
    sheet.getCell('A1').value = 'CHI TIẾT DANH SÁCH TÌNH NGUYỆN VIÊN';
    sheet.getCell('A1').font = {
      bold: true,
      size: 18,
      color: { argb: 'FFFFFFFF' },
    };
    sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '0F766E' },
    };
    sheet.getRow(1).height = 28;

    sheet.mergeCells('A2:J2');
    sheet.getCell('A2').value = `Sự kiện: ${event.title}`;
    sheet.getCell('A2').font = { bold: true, size: 13, color: { argb: '134E4A' } };

    sheet.mergeCells('A3:J3');
    sheet.getCell('A3').value = `Địa điểm: ${event.location || 'Chưa cập nhật'} | Từ ${this.formatDateTime(event.startDate)} đến ${this.formatDateTime(event.endDate)}`;
    sheet.getCell('A3').font = { italic: true, color: { argb: '334155' } };

    const headerRow = sheet.getRow(5);
    headerRow.values = [
      'STT',
      'Họ và tên',
      'Email',
      'Số điện thoại',
      'Địa chỉ',
      'Vai trò tài khoản',
      'Trạng thái tài khoản',
      'Ghi chú đăng ký',
      'Thời gian đăng ký',
      'Mã đăng ký',
    ];
    headerRow.height = 22;

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1D4ED8' },
      };
      cell.border = this.getThinBorder();
    });

    registrations.forEach((registration, index) => {
      const row = sheet.addRow({
        index: index + 1,
        fullName: registration.account?.profile?.fullName || 'Chưa cập nhật',
        email: registration.account?.email || 'N/A',
        phone: registration.account?.phone || 'Chưa cập nhật',
        address: registration.account?.profile?.address || 'Chưa cập nhật',
        role: registration.account?.role || 'N/A',
        isActive: registration.account?.isActive ? 'Đang hoạt động' : 'Đã khóa',
        note: registration.note || 'Không có',
        registeredAt: this.formatDateTime(registration.registeredAt),
        registrationId: registration.id,
      });

      row.eachCell((cell) => {
        cell.border = this.getThinBorder();
        cell.alignment = { vertical: 'top', wrapText: true };
      });

      if ((index + 1) % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F8FAFC' },
          };
        });
      }
    });

    sheet.autoFilter = {
      from: 'A5',
      to: 'J5',
    };
  }

  private getEventTypeLabel(type: EventType) {
    return type === EventType.VOLUNTEER ? 'Tình nguyện viên' : 'Quyên góp';
  }

  private getEventStatusLabel(status: EventStatus) {
    const statusLabelMap: Record<EventStatus, string> = {
      [EventStatus.DRAFT]: 'Nháp',
      [EventStatus.OPEN]: 'Đang mở',
      [EventStatus.CLOSED]: 'Đã đóng',
      [EventStatus.CANCELED]: 'Đã hủy',
    };

    return statusLabelMap[status] ?? status;
  }

  private formatDateTime(value?: Date | string | null) {
    if (!value) {
      return 'Chưa cập nhật';
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Chưa cập nhật';
    }

    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private buildReadableFileName(value: string) {
    return value
      .replace(/[\\/:*?"<>|]/g, ' ')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
  }

  private getThinBorder(): Partial<ExcelJS.Borders> {
    return {
      top: { style: 'thin', color: { argb: 'CBD5E1' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } },
    };
  }
}
