import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { ImportDto } from './dto/import.dto';
import { ImportService } from './import.service';

/** Importação em lote (CSV) de alunos + responsáveis. Só o Admin. */
@Controller('onboarding')
@Roles(Role.ADMIN)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('import')
  @HttpCode(HttpStatus.OK)
  import(@Body() dto: ImportDto) {
    return this.importService.importCsv(dto);
  }
}
