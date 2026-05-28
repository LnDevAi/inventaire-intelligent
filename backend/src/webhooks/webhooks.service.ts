import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TeltonikaPayload {
  imei: string;
  lat: number;
  lng: number;
  speed?: number;
  timestamp: string;
  deviceId?: string;
}

export interface JimiPayload {
  deviceId: string;
  lat: number;
  lng: number;
  batteryLevel?: number;
  timestamp: string;
}

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService) {}

  async handleTeltonika(payload: TeltonikaPayload) {
    const tag = await this.prisma.tag.findFirst({
      where: { imei: payload.imei, tagType: 'GPS' },
    });
    if (!tag) throw new NotFoundException(`No GPS tag enrolled for IMEI ${payload.imei}`);

    await this.prisma.tag.update({
      where: { id: tag.id },
      data: { lastSeen: new Date(payload.timestamp) },
    });

    await this.prisma.locationHistory.create({
      data: {
        assetId: tag.assetId,
        latitude: payload.lat,
        longitude: payload.lng,
        siteName: 'Teltonika GPS',
        source: 'iot:teltonika',
        timestamp: new Date(payload.timestamp),
      },
    });

    return { received: true, source: 'teltonika', assetId: tag.assetId };
  }

  async handleJimi(payload: JimiPayload) {
    const tag = await this.prisma.tag.findFirst({
      where: { hardwareId: payload.deviceId, tagType: 'BLE' },
    });
    if (!tag) throw new NotFoundException(`No BLE tag enrolled for deviceId ${payload.deviceId}`);

    await this.prisma.tag.update({
      where: { id: tag.id },
      data: {
        lastSeen: new Date(payload.timestamp),
        batteryLevel: payload.batteryLevel ?? tag.batteryLevel,
      },
    });

    await this.prisma.locationHistory.create({
      data: {
        assetId: tag.assetId,
        latitude: payload.lat,
        longitude: payload.lng,
        siteName: 'Jimi IoT BLE',
        source: 'iot:jimi',
        timestamp: new Date(payload.timestamp),
      },
    });

    return { received: true, source: 'jimi', assetId: tag.assetId };
  }
}
