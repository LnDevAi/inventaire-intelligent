import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  private computeNetBookValue(purchasePrice: number, purchaseDate: Date, depreciationYears: number): number {
    const yearsElapsed = (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const depreciated = (purchasePrice / depreciationYears) * Math.min(yearsElapsed, depreciationYears);
    return Math.max(0, purchasePrice - depreciated);
  }

  async findAll(companyId: string) {
    return this.prisma.asset.findMany({
      where: { companyId },
      include: { tags: true, _count: { select: { locationHistory: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: { tags: true, locationHistory: { orderBy: { timestamp: 'desc' }, take: 50 } },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.companyId !== companyId) throw new ForbiddenException();
    return asset;
  }

  async create(dto: CreateAssetDto, companyId: string) {
    const purchaseDate = new Date(dto.purchaseDate);
    const netBookValue = this.computeNetBookValue(dto.purchasePrice, purchaseDate, dto.depreciationYears);

    return this.prisma.asset.create({
      data: {
        name: dto.name,
        category: dto.category,
        status: dto.status ?? 'ACTIVE',
        photoUrl: dto.photoUrl,
        purchasePrice: dto.purchasePrice,
        purchaseDate,
        depreciationYears: dto.depreciationYears,
        netBookValue,
        companyId,
      },
    });
  }

  async update(id: string, dto: UpdateAssetDto, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.asset.update({ where: { id }, data: dto });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.asset.delete({ where: { id } });
  }

  async stats(companyId: string) {
    const [total, byStatus, totalValue] = await Promise.all([
      this.prisma.asset.count({ where: { companyId } }),
      this.prisma.asset.groupBy({ by: ['status'], where: { companyId }, _count: true }),
      this.prisma.asset.aggregate({ where: { companyId }, _sum: { netBookValue: true, purchasePrice: true } }),
    ]);
    return { total, byStatus, totalValue };
  }
}
