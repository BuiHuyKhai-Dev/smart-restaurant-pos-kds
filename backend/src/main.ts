import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
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

  app.enableShutdownHooks();

  const port = config.get<number>('PORT', 4000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 API đang chạy tại http://localhost:${port}/api`, 'Bootstrap');
}
bootstrap();
