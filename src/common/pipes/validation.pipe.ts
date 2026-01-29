import { ValidationPipe } from '@nestjs/common';

export const GlobalValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: false,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
});
