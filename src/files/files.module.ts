import { Module } from '@nestjs/common';
import { FilesService } from '@/files/services';
import { FilesController } from '@/files/controllers';

@Module({
  providers: [FilesService],
  controllers: [FilesController],
})
export class FilesModule {}
