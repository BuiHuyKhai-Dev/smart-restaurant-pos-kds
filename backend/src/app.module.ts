import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TableSecurityModule } from './modules/table-security/table-security.module';
import { BranchesModule } from './modules/branches/branches.module';
import { TablesModule } from './modules/tables/tables.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';
import { BomModule } from './modules/bom/bom.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { EventsModule } from './modules/events/events.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ReportsModule } from './modules/reports/reports.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    TableSecurityModule,
    BranchesModule,
    TablesModule,
    MenuModule,
    OrdersModule,
    BomModule,
    InventoryModule,
    EventsModule,
    InvoicesModule,
    ReportsModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Thứ tự guard: JWT (xác thực) chạy trước Roles (phân quyền)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformResponseInterceptor },
  ],
})
export class AppModule {}
