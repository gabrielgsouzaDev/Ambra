import { IsNotEmpty, IsString } from 'class-validator';

export class ImportDto {
  @IsString()
  @IsNotEmpty({ message: 'CSV vazio.' })
  csv!: string;
}
