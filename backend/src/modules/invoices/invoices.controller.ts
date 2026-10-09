import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentStatus, Role } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { CreateProvisionalInvoiceDto } from './dto/create-provisional-invoice.dto';
import { SettleInvoiceDto } from './dto/settle-invoice.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth.interface';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  /** In hoặc Xem trước phiếu tạm tính (Provisional Bill) */
  @Post('provisional')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.WAITER)
  createProvisional(
    @Body() dto: CreateProvisionalInvoiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoicesService.createProvisionalInvoice(dto, user);
  }

  /** Chốt hóa đơn thanh toán và giải phóng bàn */
  @Post('settle')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  settleInvoice(
    @Body() dto: SettleInvoiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoicesService.settleInvoice(dto, user);
  }

  /** Danh sách hóa đơn */
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  getInvoices(
    @Query('branchId') branchId?: string,
    @Query('status') status?: PaymentStatus,
    @Query('take') take?: string,
  ) {
    return this.invoicesService.getInvoices(
      branchId,
      status,
      take ? parseInt(take, 10) : 50,
    );
  }

  /** Chi tiết 1 hóa đơn */
  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  getInvoiceById(@Param('id') id: string) {
    return this.invoicesService.getInvoiceById(id);
  }
}

