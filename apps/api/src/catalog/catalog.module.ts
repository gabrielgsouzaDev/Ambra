import { Module } from '@nestjs/common';
import { BlocksController } from './blocks.controller';
import { BlocksService } from './blocks.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

/** Catálogo (M4): produtos da cantina + bloqueio por produto/aluno (o "X"). */
@Module({
  controllers: [ProductsController, BlocksController],
  providers: [ProductsService, BlocksService],
})
export class CatalogModule {}
