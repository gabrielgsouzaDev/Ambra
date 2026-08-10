import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
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

  @Get()
  list() {
    return this.students.list();
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

  @Post(':id/card/reissue')
  @HttpCode(HttpStatus.OK)
  reissueCard(@Param('id') id: string) {
    return this.students.reissueCard(id);
  }
}
