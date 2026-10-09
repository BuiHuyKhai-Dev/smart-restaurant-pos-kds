import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { BranchesService } from './branches.service';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Public()
  @Get()
  findAll() {
    return this.branchesService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }
}

