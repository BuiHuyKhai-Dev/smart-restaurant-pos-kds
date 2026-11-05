import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { MenuService } from './menu.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ToggleAvailabilityDto } from './dto/toggle-availability.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@ApiTags('3. Menu (Thực đơn & Trạm bếp)')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /** Lấy toàn bộ thực đơn kèm options/toppings (Hỗ trợ lọc category, station, search, onlyAvailable) */
  @ApiOperation({ summary: 'Lấy toàn bộ thực đơn kèm giá, trạm bếp và tùy chọn Topping' })
  @Public()
  @Get()
  getMenu(
    @Query('categoryId') categoryId?: string,
    @Query('stationId') stationId?: string,
    @Query('search') search?: string,
    @Query('onlyAvailable') onlyAvailable?: string,
  ) {
    const isAvailableOnly = onlyAvailable === 'true' || onlyAvailable === '1';
    return this.menuService.getMenu(categoryId, stationId, search, isAvailableOnly);
  }

  /** Lấy danh sách danh mục món ăn */
  @ApiOperation({ summary: 'Danh sách các danh mục món ăn' })
  @Public()
  @Get('categories')
  getCategories() {
    return this.menuService.getCategories();
  }

  /** Lấy danh sách trạm bếp KDS */
  @ApiOperation({ summary: 'Danh sách các trạm bếp KDS (Bếp Nóng, Bếp Lạnh, Pha Chế)' })
  @Public()
  @Get('stations')
  getStations() {
    return this.menuService.getStations();
  }

  /** Lấy chi tiết 1 món ăn */
  @ApiOperation({ summary: 'Chi tiết thông tin 1 món ăn' })
  @Public()
  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    return this.menuService.getProduct(id);
  }

  /** Thêm món ăn mới (Admin & Quản lý) */
  @ApiOperation({ summary: 'Thêm món ăn mới vào thực đơn' })
  @ApiBearerAuth('JWT-auth')
  @Post('products')
  @Roles(Role.ADMIN, Role.MANAGER)
  createProduct(@Body() dto: CreateProductDto) {
    return this.menuService.createProduct(dto);
  }

  /** Cập nhật thông tin món ăn (Admin & Quản lý) */
  @ApiOperation({ summary: 'Cập nhật thông tin món ăn' })
  @ApiBearerAuth('JWT-auth')
  @Patch('products/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.menuService.updateProduct(id, dto);
  }

  /** Bật/tắt trạng thái mở bán món ăn (Bếp/Thu ngân/Quản lý) */
  @ApiOperation({ summary: 'Bật/tắt mở bán món ăn (Báo hết món tức thì)' })
  @ApiBearerAuth('JWT-auth')
  @Patch('products/:id/availability')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.COOK)
  toggleAvailability(
    @Param('id') id: string,
    @Body() dto: ToggleAvailabilityDto,
  ) {
    return this.menuService.toggleAvailability(id, dto.isAvailable);
  }

  /** Tạo danh mục món ăn mới (Admin) */
  @ApiOperation({ summary: 'Tạo danh mục món ăn mới' })
  @ApiBearerAuth('JWT-auth')
  @Post('categories')
  @Roles(Role.ADMIN)
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.menuService.createCategory(dto);
  }
}
