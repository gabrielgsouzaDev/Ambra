import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationDto, paginated, toSkipTake } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const PRODUCT_SELECT = {
  id: true,
  name: true,
  priceCents: true,
  available: true,
  active: true,
} as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    // Uma escola por instância: o produto herda a escola existente.
    const school = await this.prisma.school.findFirst({ select: { id: true } });
    if (!school) {
      throw new NotFoundException('Escola não inicializada. Rode o seed (npm run db:seed).');
    }
    return this.prisma.product.create({
      data: { schoolId: school.id, name: dto.name, priceCents: dto.priceCents },
      select: PRODUCT_SELECT,
    });
  }

  /**
   * Catálogo paginado, só os ativos (soft-delete some daqui), com busca por nome.
   * As telas que precisam do catálogo inteiro (bloqueios no Portal, grade do PDV)
   * devem pedir `limit=100`.
   */
  async list(query: PaginationDto) {
    const where: Prisma.ProductWhereInput = {
      active: true,
      ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        ...toSkipTake(query),
        select: PRODUCT_SELECT,
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginated(items, total, query);
  }

  async getById(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, select: PRODUCT_SELECT });
    if (!product) {
      throw new NotFoundException('Produto não encontrado.');
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.ensureExists(id);
    return this.prisma.product.update({
      where: { id },
      data: { name: dto.name, priceCents: dto.priceCents, available: dto.available },
      select: PRODUCT_SELECT,
    });
  }

  /**
   * Soft-delete: some do catálogo (active=false), mas continua no histórico. O extrato
   * não quebra porque cada compra guarda snapshot de nome/preço (TransactionItem, M5).
   */
  async softDelete(id: string) {
    await this.ensureExists(id);
    return this.prisma.product.update({
      where: { id },
      data: { active: false },
      select: PRODUCT_SELECT,
    });
  }

  private async ensureExists(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!product) {
      throw new NotFoundException('Produto não encontrado.');
    }
  }
}
