import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { BranchesService } from './branches.service';

@ApiTags('7. Reports & Branches (Báo cáo & Chi nhánh)')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @ApiOperation({ summary: 'Danh sách toàn bộ chi nhánh nhà hàng' })
  @Public()
  @Get()
  findAll() {
    return this.branchesService.findAll();
  }

  @ApiOperation({ summary: 'Thông tin chi tiết 1 chi nhánh' })
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }
}
