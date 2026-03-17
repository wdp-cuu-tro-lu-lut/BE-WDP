import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '@/common/common.module';
import { DatabaseModule } from '@/database/database.module';
import { AuthModule } from '@/auth/auth.module';
import { MeModule } from '@/me/me.module';
import { AccountsModule } from '@/accounts/accounts.module';
import { TeamsModule } from '@/teams/teams.module';
import { EventsModule } from '@/events/events.module';
import { RescueModule } from '@/rescue/rescue.module';
import { DonationsModule } from '@/donations/donations.module';
import { WarehouseModule } from '@/warehouse/warehouse.module';
import { FilesModule } from '@/files/files.module';
import { CategoriesModule } from './categories/categories.module';
import { DashboardModule } from '@/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CommonModule,
    DatabaseModule,
    AuthModule,
    MeModule,
    AccountsModule,
    TeamsModule,
    EventsModule,
    RescueModule,
    DonationsModule,
    WarehouseModule,
    FilesModule,
    CategoriesModule,
    DashboardModule,
  ],
})
export class AppModule {}
