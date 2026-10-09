import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role, TableArea, TableStatus } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth.interface';
import { TablesService } from './tables.service';
import { TransferTableDto } from './dto/transfer-table.dto';
import { MergeTableDto } from './dto/merge-table.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  /** Lấy danh sách sơ đồ bàn (có thể lọc theo branchId, area, status) */
  @Public()
  @Get()
  findAll(
    @Query('branchId') branchId?: string,
    @Query('area') area?: TableArea,
    @Query('status') status?: TableStatus,
  ) {
    return this.tablesService.findAll(branchId, area, status);
  }

  /** Chi tiết 1 bàn và đơn hàng/phiên ăn đang phục vụ */
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tablesService.findOne(id);
  }

  /** Đổi khách từ bàn A sang bàn B (bàn B phải đang trống) */
  @Post('transfer')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  transferTable(@Body() dto: TransferTableDto, @CurrentUser() user: AuthUser) {
    return this.tablesService.transferTable(dto, user);
  }

  /** Gộp các món từ bàn A sang bàn B */
  @Post('merge')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  mergeTable(@Body() dto: MergeTableDto, @CurrentUser() user: AuthUser) {
    return this.tablesService.mergeTable(dto, user);
  }

  /** Cập nhật thủ công trạng thái bàn (trống / có khách / đặt trước) */
  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTableStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tablesService.updateStatus(id, dto, user);
  }

  /** Khách hoặc nhân viên bấm gọi thanh toán */
  @Public()
  @Post(':id/request-payment')
  requestPayment(@Param('id') id: string) {
    return this.tablesService.requestPayment(id);
  }
}

