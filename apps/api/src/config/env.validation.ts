import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/**
 * Converte "true"/"false" (string de env) em boolean de verdade.
 * Qualquer valor != "true" (case-insensitive) vira false — flag desligada por padrão.
 */
function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  return String(value).trim().toLowerCase() === 'true';
}

/**
 * Contrato tipado do ambiente. Validado no boot — se faltar/estiver inválido,
 * a aplicação NÃO sobe (falha alto). Segredos vivem só aqui, no servidor.
 */
export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(16, {
    message: 'JWT_SECRET deve ter no mínimo 16 caracteres (use um segredo forte).',
  })
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN: string = '1d';

  // Recarga PIX (AbacatePay) desligada até a ME. Ligar produção é decisão de negócio, não de código.
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  PAGAMENTOS_ATIVOS: boolean = false;

  @Transform(({ value }) => (value === undefined ? 3001 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3001;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN: string = 'http://localhost:3000';

  // Resend (envio de convite por e-mail). OPCIONAL: sem a chave, o sistema degrada
  // e só devolve o link de ativação — não envia e-mail (nada quebra no dev/piloto).
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  RESEND_KEY?: string;

  @IsString()
  @IsNotEmpty()
  RESEND_FROM: string = 'Ambra <onboarding@resend.dev>';
}

/**
 * Usada por ConfigModule.forRoot({ validate }). Roda uma vez, no boot.
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map((e) => Object.values(e.constraints ?? {}).join('; '))
      .join(' | ');
    throw new Error(`Configuração de ambiente inválida: ${details}`);
  }

  return validated;
}
