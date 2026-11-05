import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BomService } from './bom.service';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('6. Inventory & BOM (Tồn kho & Định lượng)')
@ApiBearerAuth('JWT-auth')
@Controller('bom')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BomController {
  constructor(private readonly bomService: BomService) {}

  @ApiOperation({ summary: 'Xem công thức định lượng nguyên liệu (BOM Recipe) của món ăn' })
  @Get('product/:id')
  async getProductRecipe(@Param('id') id: string) {
    return this.bomService.getProductRecipe(id);
  }

  @ApiOperation({ summary: 'Cấu hình / Cập nhật công thức định lượng BOM của món ăn' })
  @Put('product/:id')
  @Roles(Role.ADMIN)
  async updateProductRecipe(
    @Param('id') id: string,
    @Body() dto: UpdateRecipeDto,
  ) {
    return this.bomService.updateProductRecipe(id, dto);
  }

  @ApiOperation({ summary: 'Xem công thức định lượng của tùy chọn Topping' })
  @Get('modifier/:id')
  async getModifierRecipe(@Param('id') id: string) {
    return this.bomService.getModifierRecipe(id);
  }

  @ApiOperation({ summary: 'Cập nhật định lượng của tùy chọn Topping' })
  @Put('modifier/:id')
  @Roles(Role.ADMIN)
  async updateModifierRecipe(
    @Param('id') id: string,
    @Body() dto: UpdateRecipeDto,
  ) {
    return this.bomService.updateModifierRecipe(id, dto);
  }
}
