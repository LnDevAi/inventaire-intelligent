import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto, TagWebhookDto } from './dto/tag.dto';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async enroll(dto: CreateTagDto, companyId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id: dto.assetId, companyId } });
    if (!asset) throw new NotFoundException('Asset not found in your company');

    const existing = await this.prisma.tag.findUnique({ where: { hardwareId: dto.hardwareId } });
    if (existing) throw new ConflictException('Tag hardware ID already registered');

    return this.prisma.tag.create({
      data: {
        assetId: dto.assetId,
        tagType: dto.tagType,
        hardwareId: dto.hardwareId,
        batteryLevel: dto.batteryLevel,
        lastSeen: new Date(),
      },
    });
  }

  async findByAsset(assetId: string, companyId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id: assetId, companyId } });
    if (!asset) throw new NotFoundException('Asset not found');
    return this.prisma.tag.findMany({ where: { assetId } });
  }

  // Webhook Teltonika / Jimi IoT — reçoit la position GPS ou le signal BLE
  async handleWebhook(dto: TagWebhookDto) {
    const tag = await this.prisma.tag.findUnique({ where: { hardwareId: dto.hardwareId } });
    if (!tag) throw new NotFoundException(`Tag ${dto.hardwareId} not enrolled`);

    await this.prisma.tag.update({
      where: { id: tag.id },
      data: { lastSeen: new Date(), batteryLevel: dto.batteryLevel ?? tag.batteryLevel },
    });

    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      await this.prisma.locationHistory.create({
        data: {
          assetId: tag.assetId,
          latitude: dto.latitude,
          longitude: dto.longitude,
          siteName: 'GPS automatique',
          capturedBy: tag.assetId,
          timestamp: new Date(),
        },
      });
    }

    return { received: true };
  }
}
