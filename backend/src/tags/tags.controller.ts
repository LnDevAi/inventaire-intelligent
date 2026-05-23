import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto, TagWebhookDto } from './dto/tag.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('tags')
export class TagsController {
  constructor(private tagsService: TagsService) {}

  @Post('enroll')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  enroll(@Body() dto: CreateTagDto, @TenantId() companyId: string) {
    return this.tagsService.enroll(dto, companyId);
  }

  @Get('asset/:assetId')
  @UseGuards(JwtAuthGuard)
  findByAsset(@Param('assetId') assetId: string, @TenantId() companyId: string) {
    return this.tagsService.findByAsset(assetId, companyId);
  }

  // Endpoint public pour les webhooks Teltonika / Jimi IoT
  @Post('webhook')
  handleWebhook(@Body() dto: TagWebhookDto) {
    return this.tagsService.handleWebhook(dto);
  }
}
