import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsInt()
  @Min(0, { message: 'O preço não pode ser negativo.' })
  priceCents!: number;
}
