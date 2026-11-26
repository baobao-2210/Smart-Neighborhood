import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
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
  Gender,
  HouseholdRelation,
  ResidenceStatus,
  ResidenceType,
} from '@todanpho/shared';

export class HouseholdQueryDto {
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
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  street?: string;
}

export class CreateHouseholdDto {
  @ApiProperty({ example: 'HK-2026-0002' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: '26' })
  @IsString()
  @IsNotEmpty()
  houseNumber!: string;

  @ApiProperty({ example: 'Ngõ 12, Đường Nơ Trang Long' })
  @IsString()
  @IsNotEmpty()
  street!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class UpdateHouseholdDto {
  @IsOptional()
  @IsString()
  houseNumber?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  addressDetail?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class ResidentQueryDto {
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
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ResidenceType)
  residenceType?: ResidenceType;

  @IsOptional()
  @IsEnum(ResidenceStatus)
  residenceStatus?: ResidenceStatus;
}

export class CreateHouseholdMemberDto {
  @ApiProperty({ example: 'Nguyễn Thị Hoa' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiPropertyOptional({ example: '079192005678' })
  @IsOptional()
  @IsString()
  cccdNumber?: string;

  @ApiProperty({ example: '1992-08-20' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender!: Gender;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isHead?: boolean = false;

  @ApiPropertyOptional({ enum: HouseholdRelation, default: HouseholdRelation.CON })
  @IsOptional()
  @IsEnum(HouseholdRelation)
  relationToHead?: HouseholdRelation = HouseholdRelation.CON;

  @ApiPropertyOptional({ enum: ResidenceType, default: ResidenceType.THUONG_TRU })
  @IsOptional()
  @IsEnum(ResidenceType)
  residenceType?: ResidenceType = ResidenceType.THUONG_TRU;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiredAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateResidentDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsBoolean()
  isHead?: boolean;

  @IsOptional()
  @IsEnum(HouseholdRelation)
  relationToHead?: HouseholdRelation;

  @IsOptional()
  @IsEnum(ResidenceType)
  residenceType?: ResidenceType;

  @IsOptional()
  @IsEnum(ResidenceStatus)
  residenceStatus?: ResidenceStatus;

  @IsOptional()
  @IsDateString()
  expiredAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

