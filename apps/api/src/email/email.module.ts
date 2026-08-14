import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * E-mail global: tanto o onboarding (convites) quanto o accounts (redefinição de
 * senha) precisam enviar. Global evita a dependência circular que existiria se o
 * accounts importasse o onboarding — que já importa o accounts.
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
