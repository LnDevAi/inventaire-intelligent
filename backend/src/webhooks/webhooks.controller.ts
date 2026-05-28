import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhooksService, TeltonikaPayload, JimiPayload } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly configService: ConfigService,
  ) {}

  private validateSecret(secret: string | undefined): void {
    const expected = this.configService.get<string>('WEBHOOK_SECRET');
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid or missing webhook secret');
    }
  }

  @Post('teltonika')
  @HttpCode(HttpStatus.OK)
  async teltonika(
    @Headers('x-webhook-secret') secret: string,
    @Body() payload: TeltonikaPayload,
  ) {
    this.validateSecret(secret);
    return this.webhooksService.handleTeltonika(payload);
  }

  @Post('jimi')
  @HttpCode(HttpStatus.OK)
  async jimi(
    @Headers('x-webhook-secret') secret: string,
    @Body() payload: JimiPayload,
  ) {
    this.validateSecret(secret);
    return this.webhooksService.handleJimi(payload);
  }
}
