import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role, TableArea, TableStatus } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth.interface';
import { TablesService } from './tables.service';
import { TransferTableDto } from './dto/transfer-table.dto';
import { MergeTableDto } from './dto/merge-table.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';

@ApiTags('2. Tables (Quản lý Sơ đồ Bàn)')
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  /** Lấy danh sách sơ đồ bàn (có thể lọc theo branchId, area, status) */
  @ApiOperation({ summary: 'Lấy danh sách sơ đồ bàn ăn (hỗ trợ lọc chi nhánh, khu vực, trạng thái)' })
  @ApiQuery({ name: 'branchId', required: false, example: 'branch-1' })
  @ApiQuery({ name: 'area', required: false, enum: TableArea })
  @ApiQuery({ name: 'status', required: false, enum: TableStatus })
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
  @ApiOperation({ summary: 'Xem chi tiết 1 bàn và phiên phục vụ hiện hành' })
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tablesService.findOne(id);
  }

  /** Đổi khách từ bàn A sang bàn B (bàn B phải đang trống) */
  @ApiOperation({ summary: 'Đổi bàn từ Bàn A sang Bàn B (200 OK / 400 nếu bàn B đang bận)' })
  @ApiBearerAuth('JWT-auth')
  @Post('transfer')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  transferTable(@Body() dto: TransferTableDto, @CurrentUser() user: AuthUser) {
    return this.tablesService.transferTable(dto, user);
  }

  /** Gộp các món từ bàn A sang bàn B */
  @ApiOperation({ summary: 'Gộp các món từ Bàn A sang Bàn B để thanh toán chung' })
  @ApiBearerAuth('JWT-auth')
  @Post('merge')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  mergeTable(@Body() dto: MergeTableDto, @CurrentUser() user: AuthUser) {
    return this.tablesService.mergeTable(dto, user);
  }

  /** Cập nhật thủ công trạng thái bàn (trống / có khách / đặt trước) */
  @ApiOperation({ summary: 'Cập nhật thủ công trạng thái bàn (AVAILABLE, OCCUPIED, RESERVED)' })
  @ApiBearerAuth('JWT-auth')
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
  @ApiOperation({ summary: 'Gửi tín hiệu yêu cầu thanh toán từ bàn về POS' })
  @Public()
  @Post(':id/request-payment')
  requestPayment(@Param('id') id: string) {
    return this.tablesService.requestPayment(id);
  }
}
