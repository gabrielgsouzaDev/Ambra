import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

/** Query de paginação e busca, compartilhada pelas listagens. */
export class PaginationDto {
  @Transform(({ value }) => (value === undefined ? 1 : Number(value)))
  @IsInt()
  @Min(1)
  page: number = 1;

  @Transform(({ value }) => (value === undefined ? DEFAULT_PAGE_SIZE : Number(value)))
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE, { message: `O limite máximo por página é ${MAX_PAGE_SIZE}.` })
  limit: number = DEFAULT_PAGE_SIZE;

  /** Busca textual (o que cada listagem procura está no service). */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  q?: string;
}

/** Envelope padrão das listagens paginadas. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

/** Monta o envelope a partir do resultado do banco. */
export function paginated<T>(items: T[], total: number, dto: PaginationDto): Paginated<T> {
  return {
    items,
    total,
    page: dto.page,
    limit: dto.limit,
    hasNext: dto.page * dto.limit < total,
  };
}

/** `skip`/`take` do Prisma a partir da query. */
export function toSkipTake(dto: PaginationDto): { skip: number; take: number } {
  return { skip: (dto.page - 1) * dto.limit, take: dto.limit };
}
