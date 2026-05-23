import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class CreateLocationDto {
  @IsString()
  assetId: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  siteName: string;
}

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLocationDto, userId: string, companyId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id: dto.assetId, companyId } });
    if (!asset) throw new ForbiddenException('Asset not in your company');

    return this.prisma.locationHistory.create({
      data: {
        assetId: dto.assetId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        siteName: dto.siteName,
        capturedBy: userId,
        timestamp: new Date(),
      },
    });
  }

  async findByAsset(assetId: string, companyId: string, limit = 100) {
    const asset = await this.prisma.asset.findFirst({ where: { id: assetId, companyId } });
    if (!asset) throw new NotFoundException('Asset not found');

    return this.prisma.locationHistory.findMany({
      where: { assetId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
