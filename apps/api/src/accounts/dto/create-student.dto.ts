import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Um responsável informado no cadastro do aluno. */
export class GuardianInput {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail({}, { message: 'E-mail do responsável inválido.' })
  email!: string;
}

export class CreateStudentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  turma?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  rm!: string;

  // A trava de 1 a 2 responsáveis vive aqui: mínimo 1 (obrigatório), máximo 2.
  @IsArray()
  @ArrayMinSize(1, { message: 'Informe ao menos 1 responsável.' })
  @ArrayMaxSize(2, { message: 'Um aluno pode ter no máximo 2 responsáveis.' })
  @ValidateNested({ each: true })
  @Type(() => GuardianInput)
  guardians!: GuardianInput[];
}
