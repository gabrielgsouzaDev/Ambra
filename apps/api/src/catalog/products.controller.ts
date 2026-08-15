import {
  Body,
  Controller,
  Delete,
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
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

/** Catálogo da cantina. Gerência = Admin/Operador; leitura também pelo Responsável. */
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.OPERATOR)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  /** `?page=1&limit=100&q=coxinha` — telas que precisam do catálogo inteiro pedem limit=100. */
  @Get()
  @Roles(Role.ADMIN, Role.OPERATOR, Role.RESPONSAVEL)
  list(@Query() query: PaginationDto) {
    return this.products.list(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.OPERATOR, Role.RESPONSAVEL)
  getById(@Param('id') id: string) {
    return this.products.getById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.OPERATOR)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @HttpCode(HttpStatus.OK)
  softDelete(@Param('id') id: string) {
    return this.products.softDelete(id);
  }
}
