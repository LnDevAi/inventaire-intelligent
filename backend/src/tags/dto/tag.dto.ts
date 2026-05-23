import { IsString, IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { TagType } from '@prisma/client';

export class CreateTagDto {
  @IsString()
  assetId: string;

  @IsEnum(TagType)
  tagType: TagType;

  @IsString()
  hardwareId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  batteryLevel?: number;
}

export class TagWebhookDto {
  @IsString()
  hardwareId: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  batteryLevel?: number;
}
