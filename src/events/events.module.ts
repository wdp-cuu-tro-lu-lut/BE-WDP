import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event, VolunteerRegistration } from '@/database/entities';
import { EventsService } from '@/events/services';
import { EventsController } from '@/events/controllers';

@Module({
  imports: [TypeOrmModule.forFeature([Event, VolunteerRegistration])],
  providers: [EventsService],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
