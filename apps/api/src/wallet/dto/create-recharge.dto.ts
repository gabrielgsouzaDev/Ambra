import { IsInt, IsString, Min } from 'class-validator';
import { MIN_RECHARGE_CENTS } from '../wallet.constants';

export class CreateRechargeDto {
  @IsString()
  studentId!: string;

  @IsInt()
  @Min(MIN_RECHARGE_CENTS, {
    message: `A recarga mínima é de ${MIN_RECHARGE_CENTS} centavos.`,
  })
  amountCents!: number;
}
