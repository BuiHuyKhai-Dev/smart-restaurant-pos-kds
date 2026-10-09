import { IsBoolean, IsOptional } from 'class-validator';

export class IssueQrDto {
  /** true = tạo nonce mới, mọi mã QR cũ của bàn lập tức mất hiệu lực */
  @IsOptional()
  @IsBoolean()
  rotate?: boolean;
}

