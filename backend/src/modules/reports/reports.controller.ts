import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /** Lấy báo cáo doanh thu ngày theo chi nhánh */
  @Get('daily')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  getDailyReport(
    @Query('branchId') branchId: string,
    @Query('date') date?: string,
  ) {
    return this.reportsService.getDailyReport(branchId, date);
  }
}

