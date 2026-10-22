import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RestockDto } from './dto/restock.dto';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateSafetyStockDto } from './dto/update-safety-stock.dto';
import { Prisma } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';

export interface DeductIngredientRequirement {
  ingredientId: string;
  name: string;
  unit: string;
  amountNeeded: number;
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /** Lấy danh mục tất cả nguyên liệu */
  async getIngredients() {
    return this.prisma.ingredient.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /** Tạo nguyên liệu mới */
  async createIngredient(dto: CreateIngredientDto) {
    return this.prisma.ingredient.create({
      data: {
        name: dto.name,
        baseUnit: dto.baseUnit,
        description: dto.description,
      },
    });
  }

  /** Lấy bảng cân đối tồn kho theo chi nhánh */
  async getBranchInventory(
    branchId: string,
    filter?: 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK',
  ) {
    const inventories = await this.prisma.inventory.findMany({
      where: { branchId },
      include: {
        ingredient: true,
      },
      orderBy: {
        ingredient: { name: 'asc' },
      },
    });

    const mapped = inventories.map((inv) => {
      const currentStock = Number(inv.currentStock);
      const minSafetyStock = Number(inv.minSafetyStock);
      const costPrice = Number(inv.costPrice);

      let status: 'OK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'OK';
      if (currentStock <= 0) {
        status = 'OUT_OF_STOCK';
      } else if (currentStock <= minSafetyStock) {
        status = 'LOW_STOCK';
      }

      return {
        id: inv.id,
        branchId: inv.branchId,
        ingredientId: inv.ingredientId,
        name: inv.ingredient.name,
        unit: inv.ingredient.baseUnit,
        currentStock,
        minSafetyStock,
        costPrice,
        supplier: inv.supplier,
        lastRestockedAt: inv.lastRestockedAt,
        status,
        updatedAt: inv.updatedAt,
      };
    });

    if (filter === 'LOW_STOCK') {
      return mapped.filter((item) => item.status === 'LOW_STOCK');
    }
    if (filter === 'OUT_OF_STOCK') {
      return mapped.filter((item) => item.status === 'OUT_OF_STOCK');
    }

    return mapped;
  }

  /** Nhập kho nguyên liệu */
  async restock(dto: RestockDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Chi nhánh với ID ${dto.branchId} không tồn tại`);
    }

    return this.prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of dto.items) {
        const ingredient = await tx.ingredient.findUnique({
          where: { id: item.ingredientId },
        });
        if (!ingredient) {
          throw new NotFoundException(`Nguyên liệu ID ${item.ingredientId} không tồn tại`);
        }

        // Tìm hoặc tạo mới inventory record
        let inventory = await tx.inventory.findUnique({
          where: {
            branchId_ingredientId: {
              branchId: dto.branchId,
              ingredientId: item.ingredientId,
            },
          },
        });

        const quantity = item.quantity;
        const previousStock = inventory ? Number(inventory.currentStock) : 0;
        const newStock = previousStock + quantity;

        if (inventory) {
          inventory = await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              currentStock: newStock,
              costPrice: item.costPrice !== undefined ? item.costPrice : inventory.costPrice,
              lastRestockedAt: new Date(),
            },
          });
        } else {
          inventory = await tx.inventory.create({
            data: {
              branchId: dto.branchId,
              ingredientId: item.ingredientId,
              currentStock: newStock,
              minSafetyStock: 10,
              costPrice: item.costPrice !== undefined ? item.costPrice : 0,
              lastRestockedAt: new Date(),
            },
          });
        }

        // Ghi Audit Log (amountDeducted mang giá trị âm để biểu thị nhập kho)
        await tx.inventoryAuditLog.create({
          data: {
            branchId: dto.branchId,
            ingredientId: item.ingredientId,
            amountDeducted: -quantity,
            remainingStock: newStock,
            reason: dto.note || `Nhập thêm ${quantity} ${ingredient.baseUnit} vào kho`,
          },
        });

        results.push({
          ingredientId: item.ingredientId,
          name: ingredient.name,
          previousStock,
          addedQuantity: quantity,
          newStock,
          unit: ingredient.baseUnit,
        });
      }

      return {
        branchId: dto.branchId,
        restockedItems: results,
      };
    });
  }

  /** Cập nhật mức tồn kho an toàn */
  async updateSafetyStock(dto: UpdateSafetyStockDto) {
    const inv = await this.prisma.inventory.findUnique({
      where: {
        branchId_ingredientId: {
          branchId: dto.branchId,
          ingredientId: dto.ingredientId,
        },
      },
    });

    if (!inv) {
      throw new NotFoundException('Không tìm thấy thông tin tồn kho của nguyên liệu này tại chi nhánh');
    }

    return this.prisma.inventory.update({
      where: { id: inv.id },
      data: { minSafetyStock: dto.minSafetyStock },
    });
  }

  /** Lấy lịch sử biến động kho */
  async getAuditLogs(branchId: string, ingredientId?: string, take = 50) {
    return this.prisma.inventoryAuditLog.findMany({
      where: {
        branchId,
        ...(ingredientId ? { ingredientId } : {}),
      },
      include: {
        ingredient: {
          select: { id: true, name: true, baseUnit: true },
        },
        orderItem: {
          select: {
            id: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /**
   * ĐỘNG CƠ TRỪ KHO BOM (KDS READY) VỚI ROW-LEVEL LOCK (SELECT FOR UPDATE)
   * Đảm bảo tính nhất quán (Strict Inventory), không cho phép trừ âm, chống race-condition và deadlock.
   */
  async deductInventoryForOrderItem(orderItemId: string) {
    // 1. Kiểm tra xem món ăn này đã từng trừ kho hay chưa (tránh trùng lặp)
    const existingLog = await this.prisma.inventoryAuditLog.findFirst({
      where: { orderItemId },
    });
    if (existingLog) {
      return { skipped: true, reason: 'Món ăn này đã được trừ kho trước đó' };
    }

    // 2. Lấy thông tin order item cùng chi nhánh và định lượng recipes
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: {
          include: {
            orderSession: {
              include: { table: true },
            },
          },
        },
        product: {
          include: {
            recipes: {
              include: { ingredient: true },
            },
          },
        },
        modifiers: {
          include: {
            itemModifier: {
              include: {
                recipes: {
                  include: { ingredient: true },
                },
              },
            },
          },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException(`OrderItem với ID ${orderItemId} không tồn tại`);
    }

    const branchId =
      orderItem.order.orderSession.branchId ||
      orderItem.order.orderSession.table.branchId;

    // 3. Tính toán tổng nguyên liệu cần trừ (Món chính + Toppings)
    const requirementsMap = new Map<string, DeductIngredientRequirement>();

    // A. Định lượng từ món chính
    const itemQty = orderItem.quantity;
    for (const recipe of orderItem.product.recipes) {
      const needed = Number(recipe.amountNeeded) * itemQty;
      const ingId = recipe.ingredientId;
      if (requirementsMap.has(ingId)) {
        requirementsMap.get(ingId)!.amountNeeded += needed;
      } else {
        requirementsMap.set(ingId, {
          ingredientId: ingId,
          name: recipe.ingredient.name,
          unit: recipe.ingredient.baseUnit,
          amountNeeded: needed,
        });
      }
    }

    // B. Định lượng từ modifiers
    for (const mod of orderItem.modifiers) {
      const modQty = mod.quantity * itemQty;
      for (const modRecipe of mod.itemModifier.recipes) {
        const needed = Number(modRecipe.amountNeeded) * modQty;
        const ingId = modRecipe.ingredientId;
        if (requirementsMap.has(ingId)) {
          requirementsMap.get(ingId)!.amountNeeded += needed;
        } else {
          requirementsMap.set(ingId, {
            ingredientId: ingId,
            name: modRecipe.ingredient.name,
            unit: modRecipe.ingredient.baseUnit,
            amountNeeded: needed,
          });
        }
      }
    }

    // Nếu món không có bất kỳ định lượng nguyên liệu nào -> kết thúc
    if (requirementsMap.size === 0) {
      return { deducted: 0, message: 'Món không có định lượng BOM' };
    }

    // Sắp xếp ingredientId theo alphabet để ngăn chặn hiện tượng DEADLOCK khi nhiều order trừ kho đồng thời
    const sortedRequirements = Array.from(requirementsMap.values()).sort((a, b) =>
      a.ingredientId.localeCompare(b.ingredientId),
    );

    // 4. Thực thi Database Transaction với Row-Level Lock
    const result = await this.prisma.$transaction(async (tx) => {
      const deductedDetails = [];

      for (const req of sortedRequirements) {
        // Raw query với khóa dòng FOR UPDATE
        const rows: any[] = await tx.$queryRaw(
          Prisma.sql`
            SELECT id, branch_id, ingredient_id, current_stock, min_safety_stock 
            FROM inventories 
            WHERE branch_id = ${branchId} AND ingredient_id = ${req.ingredientId} 
            FOR UPDATE
          `,
        );

        if (!rows || rows.length === 0) {
          throw new BadRequestException(
            `Nguyên liệu "${req.name}" chưa được thiết lập kho tại chi nhánh này`,
          );
        }

        const inv = rows[0];
        const currentStock = Number(inv.current_stock);

        // Strict Inventory Check: Không cho phép trừ âm
        if (currentStock < req.amountNeeded) {
          throw new BadRequestException(
            `Kho không đủ nguyên liệu "${req.name}" để hoàn thành món! (Hiện có: ${currentStock} ${req.unit}, Cần trừ: ${req.amountNeeded} ${req.unit})`,
          );
        }

        const newStock = currentStock - req.amountNeeded;

        // Cập nhật tồn kho mới
        await tx.inventory.update({
          where: { id: inv.id },
          data: {
            currentStock: newStock,
            updatedAt: new Date(),
          },
        });

        // Ghi Audit Log
        await tx.inventoryAuditLog.create({
          data: {
            branchId,
            ingredientId: req.ingredientId,
            orderItemId: orderItem.id,
            amountDeducted: req.amountNeeded,
            remainingStock: newStock,
            reason: `Trừ kho KDS (READY) cho món ${orderItem.product.name} (SL: ${orderItem.quantity})`,
          },
        });

        deductedDetails.push({
          ingredientId: req.ingredientId,
          name: req.name,
          amountDeducted: req.amountNeeded,
          remainingStock: newStock,
          unit: req.unit,
          minSafetyStock: Number(inv.min_safety_stock),
        });
      }

      return {
        success: true,
        orderItemId,
        productName: orderItem.product.name,
        deductedDetails,
      };
    });

    // Phát cảnh báo nguyên liệu chạm ngưỡng đỏ/vàng
    if (result?.deductedDetails) {
      for (const item of result.deductedDetails) {
        if (item.remainingStock <= item.minSafetyStock) {
          this.eventsGateway.emitLowStockAlert({
            branchId,
            ingredientId: item.ingredientId,
            ingredientName: item.name,
            currentStock: item.remainingStock,
            minSafetyStock: item.minSafetyStock,
            unit: item.unit,
          });
        }
      }
    }

    return result;
  }

  /**
   * ĐỘNG CƠ TRỪ KHO BOM BATCH (HOÀN TẤT TOÀN BỘ VÉ KDS)
   * Xử lý trừ kho cho toàn bộ danh sách món ăn trong 1 Transaction duy nhất.
   * Gom định lượng nguyên liệu, khóa dòng SELECT FOR UPDATE 1 lần, chống deadlock và triệt tiêu request storm.
   */
  async deductInventoryForOrderItems(orderItemIds: string[]) {
    if (!orderItemIds || orderItemIds.length === 0) {
      return { skipped: true, reason: 'Danh sách món rỗng' };
    }

    // 1. Kiểm tra các món đã từng trừ kho chưa
    const existingLogs = await this.prisma.inventoryAuditLog.findMany({
      where: { orderItemId: { in: orderItemIds } },
      select: { orderItemId: true },
    });
    const deductedItemIds = new Set(existingLogs.map((l) => l.orderItemId).filter(Boolean));

    // Lọc ra các món chưa trừ kho
    const targetItemIds = orderItemIds.filter((id) => !deductedItemIds.has(id));
    if (targetItemIds.length === 0) {
      return { skipped: true, reason: 'Toàn bộ các món đã được trừ kho trước đó' };
    }

    // 2. Lấy thông tin các món cùng chi nhánh và định lượng recipes
    const orderItems = await this.prisma.orderItem.findMany({
      where: { id: { in: targetItemIds } },
      include: {
        order: {
          include: {
            orderSession: {
              include: { table: true },
            },
          },
        },
        product: {
          include: {
            recipes: {
              include: { ingredient: true },
            },
          },
        },
        modifiers: {
          include: {
            itemModifier: {
              include: {
                recipes: {
                  include: { ingredient: true },
                },
              },
            },
          },
        },
      },
    });

    if (orderItems.length === 0) {
      return { skipped: true, reason: 'Không tìm thấy món ăn hợp lệ' };
    }

    const branchId =
      orderItems[0].order.orderSession.branchId ||
      orderItems[0].order.orderSession.table.branchId;

    // 3. Gom tổng nguyên liệu cần trừ trên toàn bộ các món trong vé
    interface BatchIngredientUsage {
      orderItemId: string;
      productName: string;
      itemQty: number;
      amount: number;
    }
    interface BatchRequirement {
      ingredientId: string;
      name: string;
      unit: string;
      totalAmountNeeded: number;
      usages: BatchIngredientUsage[];
    }

    const requirementsMap = new Map<string, BatchRequirement>();

    for (const item of orderItems) {
      const itemQty = item.quantity;

      // A. Món chính
      for (const recipe of item.product.recipes) {
        const needed = Number(recipe.amountNeeded) * itemQty;
        const ingId = recipe.ingredientId;
        if (!requirementsMap.has(ingId)) {
          requirementsMap.set(ingId, {
            ingredientId: ingId,
            name: recipe.ingredient.name,
            unit: recipe.ingredient.baseUnit,
            totalAmountNeeded: 0,
            usages: [],
          });
        }
        const req = requirementsMap.get(ingId)!;
        req.totalAmountNeeded += needed;
        req.usages.push({
          orderItemId: item.id,
          productName: item.product.name,
          itemQty,
          amount: needed,
        });
      }

      // B. Modifiers
      for (const mod of item.modifiers) {
        const modQty = mod.quantity * itemQty;
        for (const modRecipe of mod.itemModifier.recipes) {
          const needed = Number(modRecipe.amountNeeded) * modQty;
          const ingId = modRecipe.ingredientId;
          if (!requirementsMap.has(ingId)) {
            requirementsMap.set(ingId, {
              ingredientId: ingId,
              name: modRecipe.ingredient.name,
              unit: modRecipe.ingredient.baseUnit,
              totalAmountNeeded: 0,
              usages: [],
            });
          }
          const req = requirementsMap.get(ingId)!;
          req.totalAmountNeeded += needed;
          req.usages.push({
            orderItemId: item.id,
            productName: `${item.product.name} (+${mod.itemModifier.name})`,
            itemQty,
            amount: needed,
          });
        }
      }
    }

    // Nếu vé không có nguyên liệu BOM nào cần trừ
    if (requirementsMap.size === 0) {
      return { deducted: 0, message: 'Các món trong vé không có định lượng BOM' };
    }

    // Sắp xếp ingredientId theo alphabet để chống Deadlock
    const sortedRequirements = Array.from(requirementsMap.values()).sort((a, b) =>
      a.ingredientId.localeCompare(b.ingredientId),
    );

    // 4. Thực thi duy nhất 1 Transaction Database với khóa dòng
    const result = await this.prisma.$transaction(async (tx) => {
      const deductedDetails = [];

      for (const req of sortedRequirements) {
        const rows: any[] = await tx.$queryRaw(
          Prisma.sql`
            SELECT id, branch_id, ingredient_id, current_stock, min_safety_stock 
            FROM inventories 
            WHERE branch_id = ${branchId} AND ingredient_id = ${req.ingredientId} 
            FOR UPDATE
          `,
        );

        if (!rows || rows.length === 0) {
          throw new BadRequestException(
            `Nguyên liệu "${req.name}" chưa được thiết lập kho tại chi nhánh này`,
          );
        }

        const inv = rows[0];
        const currentStock = Number(inv.current_stock);

        if (currentStock < req.totalAmountNeeded) {
          throw new BadRequestException(
            `Kho không đủ nguyên liệu "${req.name}" để hoàn thành toàn bộ vé! (Hiện có: ${currentStock} ${req.unit}, Cần trừ: ${req.totalAmountNeeded} ${req.unit})`,
          );
        }

        const newStock = currentStock - req.totalAmountNeeded;

        // Cập nhật tồn kho 1 lần duy nhất cho mỗi nguyên liệu
        await tx.inventory.update({
          where: { id: inv.id },
          data: {
            currentStock: newStock,
            updatedAt: new Date(),
          },
        });

        // Ghi Audit Log cho từng món sử dụng nguyên liệu
        let runningRemaining = currentStock;
        for (const usage of req.usages) {
          runningRemaining -= usage.amount;
          await tx.inventoryAuditLog.create({
            data: {
              branchId,
              ingredientId: req.ingredientId,
              orderItemId: usage.orderItemId,
              amountDeducted: usage.amount,
              remainingStock: runningRemaining,
              reason: `Trừ kho KDS Batch (READY) cho món ${usage.productName} (SL: ${usage.itemQty})`,
            },
          });
        }

        deductedDetails.push({
          ingredientId: req.ingredientId,
          name: req.name,
          amountDeducted: req.totalAmountNeeded,
          remainingStock: newStock,
          unit: req.unit,
          minSafetyStock: Number(inv.min_safety_stock),
        });
      }

      return {
        success: true,
        orderItemIds: targetItemIds,
        deductedDetails,
      };
    });

    // Phát cảnh báo nguyên liệu chạm ngưỡng an toàn
    if (result?.deductedDetails) {
      for (const item of result.deductedDetails) {
        if (item.remainingStock <= item.minSafetyStock) {
          this.eventsGateway.emitLowStockAlert({
            branchId,
            ingredientId: item.ingredientId,
            ingredientName: item.name,
            currentStock: item.remainingStock,
            minSafetyStock: item.minSafetyStock,
            unit: item.unit,
          });
        }
      }
    }

    return result;
  }
}

