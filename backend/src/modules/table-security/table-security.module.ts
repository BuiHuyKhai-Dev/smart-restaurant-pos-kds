import { Module } from '@nestjs/common';
import { TableGuestGuard } from '../../common/guards/table-guest.guard';
import { TableSecurityController } from './table-security.controller';
import { TableTokenService } from './table-token.service';

/** Các module khác (Orders, ...) import module này để dùng TableGuestGuard */
@Module({
  controllers: [TableSecurityController],
  providers: [TableTokenService, TableGuestGuard],
  exports: [TableTokenService, TableGuestGuard],
})
export class TableSecurityModule {}

