import { IsString, IsEnum, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';
import { AssetStatus } from '@prisma/client';

export class CreateAssetDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsEnum(AssetStatus)
  @IsOptional()
  status?: AssetStatus;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @IsDateString()
  purchaseDate: string;

  @IsNumber()
  @Min(1)
  depreciationYears: number;
}

export class UpdateAssetDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(AssetStatus)
  @IsOptional()
  status?: AssetStatus;

  @IsString()
  @IsOptional()
  photoUrl?: string;
}
