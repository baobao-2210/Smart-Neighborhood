import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class UpdateUserSettingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushAnnouncements?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushEvents?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushReports?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushMessages?: boolean;

  @ApiPropertyOptional({ enum: ['EVERYONE', 'NEIGHBORHOOD_ONLY', 'OFFICERS_ONLY'] })
  @IsOptional()
  @IsIn(['EVERYONE', 'NEIGHBORHOOD_ONLY', 'OFFICERS_ONLY'])
  allowDirectMessage?: 'EVERYONE' | 'NEIGHBORHOOD_ONLY' | 'OFFICERS_ONLY';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPhoneNumber?: boolean;
}

export class CreateDeletionRequestDto {
  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nêu lý do yêu cầu xóa tài khoản' })
  @MaxLength(500)
  reason!: string;
}

export class HistoryQueryDto {
  @IsOptional()
  @IsIn(['ALL', 'POSTS', 'REPORTS', 'EVENTS'])
  type?: 'ALL' | 'POSTS' | 'REPORTS' | 'EVENTS' = 'ALL';

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
}

