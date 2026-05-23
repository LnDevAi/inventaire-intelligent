import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetsController {
  constructor(private assetsService: AssetsService) {}

  @Get()
  findAll(@TenantId() companyId: string) {
    return this.assetsService.findAll(companyId);
  }

  @Get('stats')
  stats(@TenantId() companyId: string) {
    return this.assetsService.stats(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() companyId: string) {
    return this.assetsService.findOne(id, companyId);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(@Body() dto: CreateAssetDto, @TenantId() companyId: string) {
    return this.assetsService.create(dto, companyId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto, @TenantId() companyId: string) {
    return this.assetsService.update(id, dto, companyId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string, @TenantId() companyId: string) {
    return this.assetsService.remove(id, companyId);
  }
}
