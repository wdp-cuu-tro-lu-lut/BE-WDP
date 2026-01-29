import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '@/app.module';
import { GlobalValidationPipe } from '@/common/pipes';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(GlobalValidationPipe);

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle(process.env.APP_NAME || 'Rescue Relief API')
    .setDescription('API for Rescue & Relief System')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      operationsSorter: (a: any, b: any) => {
        const methodsOrder = ['get', 'post', 'put', 'patch', 'delete', 'options', 'trace'];
        let result =
          methodsOrder.indexOf(a.get('method')) -
          methodsOrder.indexOf(b.get('method'));

        if (result === 0) {
          result = a.get('path').localeCompare(b.get('path'));
        }

        return result;
      },
    },
  });

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
  console.log(`Application running on http://localhost:${port}`);
  console.log(`API documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
