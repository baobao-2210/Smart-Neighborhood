import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  ReportCategory,
  ReportPriority,
  ReportStatus,
  ReportVisibility,
} from '@todanpho/shared';

export class ReportQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(ReportCategory)
  category?: ReportCategory;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsOptional()
  @IsEnum(ReportVisibility)
  visibility?: ReportVisibility;

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateReportDto {
  @ApiProperty({ example: 'Hỏng đèn đường hẻm 12' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Trụ đèn số 3 bị tắt 2 hôm nay.' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ enum: ReportCategory, default: ReportCategory.OTHER })
  @IsOptional()
  @IsEnum(ReportCategory)
  category?: ReportCategory = ReportCategory.OTHER;

  @ApiPropertyOptional({ enum: ReportPriority, default: ReportPriority.NORMAL })
  @IsOptional()
  @IsEnum(ReportPriority)
  priority?: ReportPriority = ReportPriority.NORMAL;

  @ApiPropertyOptional({ enum: ReportVisibility, default: ReportVisibility.PUBLIC })
  @IsOptional()
  @IsEnum(ReportVisibility)
  visibility?: ReportVisibility = ReportVisibility.PUBLIC;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressText?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];
}

export class UpdateReportStatusDto {
  @ApiProperty({ enum: ReportStatus })
  @IsEnum(ReportStatus)
  status!: ReportStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;
}

export class AssignReportDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  assignedToId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class AcceptReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
