import { IsInt, IsOptional, Min } from 'class-validator';

export class SetDailyLimitDto {
  /** Limite diário em centavos. `null` (ou ausente) remove o limite. */
  @IsOptional()
  @IsInt()
  @Min(0)
  dailyLimitCents?: number | null;
}
