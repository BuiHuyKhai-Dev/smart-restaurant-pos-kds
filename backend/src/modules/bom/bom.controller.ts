import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { BomService } from './bom.service';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('bom')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BomController {
  constructor(private readonly bomService: BomService) {}

  @Get('product/:id')
  async getProductRecipe(@Param('id') id: string) {
    return this.bomService.getProductRecipe(id);
  }

  @Put('product/:id')
  @Roles(Role.ADMIN)
  async updateProductRecipe(
    @Param('id') id: string,
    @Body() dto: UpdateRecipeDto,
  ) {
    return this.bomService.updateProductRecipe(id, dto);
  }

  @Get('modifier/:id')
  async getModifierRecipe(@Param('id') id: string) {
    return this.bomService.getModifierRecipe(id);
  }

  @Put('modifier/:id')
  @Roles(Role.ADMIN)
  async updateModifierRecipe(
    @Param('id') id: string,
    @Body() dto: UpdateRecipeDto,
  ) {
    return this.bomService.updateModifierRecipe(id, dto);
  }
}

