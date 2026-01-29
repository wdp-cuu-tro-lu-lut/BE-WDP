import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { NotificationService } from './services/notification.service';

/**
 * Common module for shared utilities, interceptors, guards, pipes, etc.
 */
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    NotificationService,
  ],
  exports: [NotificationService],
})
export class CommonModule {}
