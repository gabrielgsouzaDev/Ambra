import { IsEnum, IsOptional } from 'class-validator';
import { UserStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListGuardiansDto extends PaginationDto {
  /** Sem filtro devolve todos; `PENDING` alimenta a tela de convites pendentes. */
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Status deve ser PENDING ou ACTIVE.' })
  status?: UserStatus;
}
