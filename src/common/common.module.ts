import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { NotificationService } from './services/notification.service';
import { RealtimeGateway } from './gateways';
import { RealtimeNotificationService } from './services/realtime-notification.service';

/**
 * Common module for shared utilities, interceptors, guards, pipes, etc.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
      }),
    }),
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    NotificationService,
    RealtimeGateway,
    RealtimeNotificationService,
  ],
  exports: [NotificationService, RealtimeGateway, RealtimeNotificationService],
})
export class CommonModule {}
