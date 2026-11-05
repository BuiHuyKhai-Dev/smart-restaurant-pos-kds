import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('7. Reports & Branches (Báo cáo & Chi nhánh)')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /** Lấy báo cáo doanh thu ngày theo chi nhánh */
  @ApiOperation({ summary: 'Báo cáo doanh thu trong ngày theo chi nhánh' })
  @Get('daily')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  getDailyReport(
    @Query('branchId') branchId: string,
    @Query('date') date?: string,
  ) {
    return this.reportsService.getDailyReport(branchId, date);
  }
}
