import { IsString, MinLength } from 'class-validator';

export class ActivateDto {
  @IsString()
  @MinLength(1)
  token!: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  password!: string;
}
