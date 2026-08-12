import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateOperatorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail({}, { message: 'E-mail do operador inválido.' })
  email!: string;
}
