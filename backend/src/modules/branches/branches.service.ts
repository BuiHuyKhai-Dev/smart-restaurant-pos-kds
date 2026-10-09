import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(onlyActive = true) {
    return this.prisma.branch.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      select: {
        id: true,
        name: true,
        address: true,
        phoneNumber: true,
        isActive: true,
        _count: {
          select: {
            tables: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        tables: {
          orderBy: { tableNumber: 'asc' },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException(`Chi nhánh với ID ${id} không tồn tại`);
    }

    return branch;
  }
}

