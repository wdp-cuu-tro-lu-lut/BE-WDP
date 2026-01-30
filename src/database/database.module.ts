import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 3306),
        username: configService.get('DB_USERNAME', 'root'),
        password: configService.get('DB_PASSWORD', 'password'),
        database: configService.get('DB_DATABASE', 'rescue_relief_db'),
        entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
        migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development',
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
      }),
    }),
  ],
})
export class DatabaseModule {}
