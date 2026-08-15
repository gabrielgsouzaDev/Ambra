import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

/**
 * Paginação + a data do fechamento. Precisa ser um DTO só: o ValidationPipe global
 * usa `forbidNonWhitelisted`, então uma query fora do DTO seria recusada com 400.
 */
export class DailyTransactionsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  date?: string;
}
