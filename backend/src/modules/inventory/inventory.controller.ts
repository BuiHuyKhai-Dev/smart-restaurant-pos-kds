import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { RestockDto } from './dto/restock.dto';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateSafetyStockDto } from './dto/update-safety-stock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('6. Inventory & BOM (Tồn kho & Định lượng)')
@ApiBearerAuth('JWT-auth')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiOperation({ summary: 'Danh sách toàn bộ nguyên vật liệu' })
  @Get('ingredients')
  async getIngredients() {
    return this.inventoryService.getIngredients();
  }

  @ApiOperation({ summary: 'Thêm nguyên vật liệu mới' })
  @Post('ingredients')
  @Roles(Role.ADMIN)
  async createIngredient(@Body() dto: CreateIngredientDto) {
    return this.inventoryService.createIngredient(dto);
  }

  @ApiOperation({ summary: 'Xem tồn kho theo chi nhánh (hỗ trợ lọc LOW_STOCK, OUT_OF_STOCK)' })
  @Get()
  async getBranchInventory(
    @Query('branchId') branchId: string,
    @Query('filter') filter?: 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK',
  ) {
    return this.inventoryService.getBranchInventory(branchId, filter);
  }

  @ApiOperation({ summary: 'Nhập kho bổ sung nguyên vật liệu' })
  @Post('restock')
  @Roles(Role.ADMIN, Role.CASHIER)
  async restock(@Body() dto: RestockDto) {
    return this.inventoryService.restock(dto);
  }

  @ApiOperation({ summary: 'Cập nhật ngưỡng tồn kho an toàn tối thiểu' })
  @Patch('safety-stock')
  @Roles(Role.ADMIN)
  async updateSafetyStock(@Body() dto: UpdateSafetyStockDto) {
    return this.inventoryService.updateSafetyStock(dto);
  }

  @ApiOperation({ summary: 'Nhật ký kiểm toán trừ kho tự động theo BOM' })
  @Get('audit-logs')
  async getAuditLogs(
    @Query('branchId') branchId: string,
    @Query('ingredientId') ingredientId?: string,
    @Query('take') take?: string,
  ) {
    return this.inventoryService.getAuditLogs(
      branchId,
      ingredientId,
      take ? parseInt(take, 10) : 50,
    );
  }
}
