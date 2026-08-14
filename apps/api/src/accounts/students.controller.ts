import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SetPhotoDto } from './dto/set-photo.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { StudentsService } from './students.service';

/** Cadastro e consulta de alunos. Restrito ao Admin da escola. */
@Controller('students')
@Roles(Role.ADMIN)
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateStudentDto) {
    return this.students.createStudent(dto);
  }

  /** `?page=1&limit=25&q=ana` — busca por nome ou RM. */
  @Get()
  list(@Query() query: PaginationDto) {
    return this.students.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.students.getById(id);
  }

  @Post(':id/card/block')
  @HttpCode(HttpStatus.OK)
  blockCard(@Param('id') id: string) {
    return this.students.blockCard(id);
  }

  /** Desbloqueia mantendo o mesmo QR (bloqueio por engano / cartão reapareceu). */
  @Post(':id/card/unblock')
  @HttpCode(HttpStatus.OK)
  unblockCard(@Param('id') id: string) {
    return this.students.unblockCard(id);
  }

  @Post(':id/card/reissue')
  @HttpCode(HttpStatus.OK)
  reissueCard(@Param('id') id: string) {
    return this.students.reissueCard(id);
  }

  /** Define ou remove a foto do aluno (URL já hospedada; opcional por LGPD). */
  @Patch(':id/photo')
  setPhoto(@Param('id') id: string, @Body() dto: SetPhotoDto) {
    return this.students.setPhoto(id, dto.photoUrl ?? null);
  }
}
