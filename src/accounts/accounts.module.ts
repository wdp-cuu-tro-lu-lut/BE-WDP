import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account, Profile, Verification } from '@/database/entities';
import { AccountsService } from '@/accounts/services';
import { AccountsController } from '@/accounts/controllers';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Profile, Verification]), CommonModule],
  providers: [AccountsService],
  controllers: [AccountsController],
  exports: [AccountsService],
})
export class AccountsModule {}
