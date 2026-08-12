import { IsInt, IsOptional, Min } from 'class-validator';

export class SetAlertThresholdDto {
  /** Limiar do alerta de saldo baixo, em centavos. `null` (ou ausente) desliga. */
  @IsOptional()
  @IsInt()
  @Min(0)
  thresholdCents?: number | null;
}
