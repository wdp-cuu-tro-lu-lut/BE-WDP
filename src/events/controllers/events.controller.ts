import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@/common';
import { AccountRole } from '@/database/entities';
import { EventsService } from '@/events/services';
import {
  CreateEventDto,
  UpdateEventDto,
  UpdateEventStatusDto,
  ListEventsQueryDto,
  VolunteerRegistrationDto,
} from '@/events/dto';

@Controller('events')
@ApiTags('Events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List all events' })
  async listEvents(@Query() query: ListEventsQueryDto) {
    return this.eventsService.listEvents(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  async getEvent(@Param('id') id: string) {
    return this.eventsService.getEvent(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.ADMIN)
  @ApiOperation({ summary: 'Create event (ADMIN)' })
  async createEvent(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.createEvent(createEventDto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.ADMIN)
  @ApiOperation({ summary: 'Update event (ADMIN)' })
  async updateEvent(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventsService.updateEvent(id, updateEventDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.ADMIN)
  @ApiOperation({ summary: 'Delete event (ADMIN)' })
  async deleteEvent(@Param('id') id: string) {
    return this.eventsService.deleteEvent(id);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.ADMIN)
  @ApiOperation({ summary: 'Update event status (ADMIN)' })
  async updateEventStatus(
    @Param('id') id: string,
    @Body() statusDto: UpdateEventStatusDto,
  ) {
    return this.eventsService.updateEventStatus(id, statusDto);
  }

  @Post(':id/volunteer-registrations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.USER, AccountRole.RESCUE_TEAM)
  @ApiOperation({ summary: 'Register as volunteer (USER/RESCUE_TEAM)' })
  async registerVolunteer(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() registrationDto: VolunteerRegistrationDto,
  ) {
    return this.eventsService.registerVolunteer(
      id,
      user.id,
      registrationDto,
    );
  }

  @Get(':id/volunteer-registrations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.STAFF, AccountRole.ADMIN)
  @ApiOperation({ summary: 'List event volunteers (STAFF/ADMIN)' })
  async getEventVolunteers(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.eventsService.getEventVolunteers(id, page, limit);
  }
}
