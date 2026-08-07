import { Controller, Get } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { Public } from '../auth/decorators/public.decorator';

interface HealthStatus {
  status: 'ok';
  paymentsEnabled: boolean;
  timestamp: string;
}

@Controller('health')
export class HealthController {
  constructor(private readonly config: AppConfigService) {}

  /** Liveness público. Também expõe o estado da flag de pagamentos. */
  @Public()
  @Get()
  check(): HealthStatus {
    return {
      status: 'ok',
      paymentsEnabled: this.config.isPaymentsEnabled,
      timestamp: new Date().toISOString(),
    };
  }
}
