import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'O preço não pode ser negativo.' })
  priceCents?: number;

  // Toggle do operador: acabou → available=false → some/cinza no PDV. Não é estoque.
  @IsOptional()
  @IsBoolean()
  available?: boolean;
}
