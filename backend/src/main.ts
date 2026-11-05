import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  const corsRaw = config.get<string>('CORS_ORIGIN', '*');
  const origins = corsRaw === '*' ? '*' : corsRaw.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // bỏ field không khai báo trong DTO
      forbidNonWhitelisted: true, // ...và báo lỗi nếu client gửi field lạ
      transform: true,
    }),
  );

  // Cấu hình Swagger/OpenAPI Documentation tại http://localhost:4000/api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Smart Restaurant POS & KDS API')
    .setDescription('Tài liệu đặc tả hệ thống API cốt lõi cho Nhà Hàng Thông Minh (POS, KDS, QR Order, BOM Tồn kho)')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Nhập JWT Bearer token của nhân viên (Admin, Manager, Cashier, Cook, Waiter)',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-table-token',
        in: 'header',
        description: 'Mã xác thực bàn quét qua QR (Table Guest HMAC Token)',
      },
      'Table-Token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Smart Restaurant API Docs - Swagger',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app.enableShutdownHooks();

  const port = config.get<number>('PORT', 4000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 API đang chạy tại http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`📑 Swagger OpenAPI Docs sẵn sàng tại http://localhost:${port}/api/docs`, 'Bootstrap');
}
bootstrap();
