import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { LocationsService, CreateLocationDto } from './locations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  @Post()
  create(@Body() dto: CreateLocationDto, @Request() req: any, @TenantId() companyId: string) {
    return this.locationsService.create(dto, req.user.id, companyId);
  }

  @Get('asset/:assetId')
  findByAsset(
    @Param('assetId') assetId: string,
    @TenantId() companyId: string,
    @Query('limit') limit?: string,
  ) {
    return this.locationsService.findByAsset(assetId, companyId, limit ? parseInt(limit) : 100);
  }
}
