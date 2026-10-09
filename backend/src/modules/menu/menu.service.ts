import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lấy toàn bộ thực đơn kèm danh mục, trạm bếp và nhóm tùy chọn (Size, Độ cay, Topping) */
  async getMenu(
    categoryId?: string,
    stationId?: string,
    search?: string,
    onlyAvailable = false,
  ) {
    return this.prisma.product.findMany({
      where: {
        categoryId: categoryId || undefined,
        kitchenStationId: stationId || undefined,
        isAvailable: onlyAvailable ? true : undefined,
        name: search ? { contains: search, mode: 'insensitive' } : undefined,
      },
      include: {
        category: {
          select: { id: true, name: true, displayOrder: true },
        },
        kitchenStation: {
          select: { id: true, name: true, color: true, iconName: true },
        },
        modifiers: {
          include: {
            modifierGroup: {
              include: {
                items: {
                  where: { isAvailable: true },
                  orderBy: { extraPrice: 'asc' },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { category: { displayOrder: 'asc' } },
        { name: 'asc' },
      ],
    });
  }

  /** Lấy danh sách danh mục món ăn */
  async getCategories() {
    return this.prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  /** Lấy danh sách các trạm bếp KDS */
  async getStations() {
    return this.prisma.kitchenStation.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  /** Chi tiết 1 món ăn, kèm công thức định lượng BOM và tuỳ chọn */
  async getProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        kitchenStation: true,
        modifiers: {
          include: {
            modifierGroup: {
              include: {
                items: true,
              },
            },
          },
        },
        recipes: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy món ăn với ID ${id}`);
    }

    return product;
  }

  /** Thêm món ăn mới */
  async createProduct(dto: CreateProductDto) {
    const [category, station] = await Promise.all([
      this.prisma.category.findUnique({ where: { id: dto.categoryId } }),
      this.prisma.kitchenStation.findUnique({ where: { id: dto.kitchenStationId } }),
    ]);

    if (!category) {
      throw new BadRequestException(`Danh mục với ID ${dto.categoryId} không tồn tại`);
    }
    if (!station) {
      throw new BadRequestException(`Trạm bếp với ID ${dto.kitchenStationId} không tồn tại`);
    }

    return this.prisma.product.create({
      data: {
        name: dto.name,
        categoryId: dto.categoryId,
        kitchenStationId: dto.kitchenStationId,
        price: dto.price,
        description: dto.description,
        pictureLink: dto.pictureLink,
        isAvailable: dto.isAvailable ?? true,
        standardPrepMinutes: dto.standardPrepMinutes ?? 15,
      },
      include: {
        category: true,
        kitchenStation: true,
      },
    });
  }

  /** Cập nhật thông tin món ăn */
  async updateProduct(id: string, dto: UpdateProductDto) {
    await this.getProduct(id);

    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        categoryId: dto.categoryId,
        kitchenStationId: dto.kitchenStationId,
        price: dto.price,
        description: dto.description,
        pictureLink: dto.pictureLink,
        isAvailable: dto.isAvailable,
        standardPrepMinutes: dto.standardPrepMinutes,
      },
      include: {
        category: true,
        kitchenStation: true,
      },
    });
  }

  /** Bật/tắt trạng thái mở bán món ăn nhanh chóng */
  async toggleAvailability(id: string, isAvailable: boolean) {
    await this.getProduct(id);

    return this.prisma.product.update({
      where: { id },
      data: { isAvailable },
      select: {
        id: true,
        name: true,
        isAvailable: true,
      },
    });
  }

  /** Tạo danh mục món ăn mới */
  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        description: dto.description,
        displayOrder: dto.displayOrder ?? 0,
      },
    });
  }
}

