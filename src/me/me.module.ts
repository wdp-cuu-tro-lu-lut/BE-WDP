import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account, Profile } from '@/database/entities';
import { MeService } from '@/me/services';
import { MeController } from '@/me/controllers';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Profile])],
  providers: [MeService],
  controllers: [MeController],
})
export class MeModule {}
