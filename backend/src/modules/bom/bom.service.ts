import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

@Injectable()
export class BomService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lấy công thức định lượng của sản phẩm */
  async getProductRecipe(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        recipes: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Sản phẩm với ID ${productId} không tồn tại`);
    }

    return {
      productId: product.id,
      productName: product.name,
      recipes: product.recipes.map((r) => ({
        id: r.id,
        ingredientId: r.ingredientId,
        ingredientName: r.ingredient.name,
        amountNeeded: Number(r.amountNeeded),
        unit: r.ingredient.baseUnit,
      })),
    };
  }

  /** Cập nhật công thức định lượng cho món chính */
  async updateProductRecipe(productId: string, dto: UpdateRecipeDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Sản phẩm với ID ${productId} không tồn tại`);
    }

    // Thực hiện trong transaction: Xóa công thức cũ và lưu công thức mới
    return this.prisma.$transaction(async (tx) => {
      await tx.recipe.deleteMany({
        where: { productId },
      });

      if (dto.recipes.length > 0) {
        await tx.recipe.createMany({
          data: dto.recipes.map((item) => ({
            productId,
            ingredientId: item.ingredientId,
            amountNeeded: item.amountNeeded,
          })),
        });
      }

      const updated = await tx.product.findUnique({
        where: { id: productId },
        include: {
          recipes: {
            include: { ingredient: true },
          },
        },
      });

      return {
        productId: updated!.id,
        productName: updated!.name,
        recipes: updated!.recipes.map((r) => ({
          id: r.id,
          ingredientId: r.ingredientId,
          ingredientName: r.ingredient.name,
          amountNeeded: Number(r.amountNeeded),
          unit: r.ingredient.baseUnit,
        })),
      };
    });
  }

  /** Lấy công thức định lượng của modifier/topping */
  async getModifierRecipe(modifierId: string) {
    const modifier = await this.prisma.itemModifier.findUnique({
      where: { id: modifierId },
      include: {
        recipes: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!modifier) {
      throw new NotFoundException(`Topping với ID ${modifierId} không tồn tại`);
    }

    return {
      modifierId: modifier.id,
      modifierName: modifier.name,
      recipes: modifier.recipes.map((r) => ({
        id: r.id,
        ingredientId: r.ingredientId,
        ingredientName: r.ingredient.name,
        amountNeeded: Number(r.amountNeeded),
        unit: r.ingredient.baseUnit,
      })),
    };
  }

  /** Cập nhật công thức định lượng cho modifier/topping */
  async updateModifierRecipe(modifierId: string, dto: UpdateRecipeDto) {
    const modifier = await this.prisma.itemModifier.findUnique({
      where: { id: modifierId },
    });

    if (!modifier) {
      throw new NotFoundException(`Topping với ID ${modifierId} không tồn tại`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.modifierRecipe.deleteMany({
        where: { itemModifierId: modifierId },
      });

      if (dto.recipes.length > 0) {
        await tx.modifierRecipe.createMany({
          data: dto.recipes.map((item) => ({
            itemModifierId: modifierId,
            ingredientId: item.ingredientId,
            amountNeeded: item.amountNeeded,
          })),
        });
      }

      const updated = await tx.itemModifier.findUnique({
        where: { id: modifierId },
        include: {
          recipes: {
            include: { ingredient: true },
          },
        },
      });

      return {
        modifierId: updated!.id,
        modifierName: updated!.name,
        recipes: updated!.recipes.map((r) => ({
          id: r.id,
          ingredientId: r.ingredientId,
          ingredientName: r.ingredient.name,
          amountNeeded: Number(r.amountNeeded),
          unit: r.ingredient.baseUnit,
        })),
      };
    });
  }
}

