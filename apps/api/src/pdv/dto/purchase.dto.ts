import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class PurchaseItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class PurchaseDto {
  @IsString()
  studentId!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'O pedido precisa de ao menos 1 item.' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items!: PurchaseItemDto[];
}
