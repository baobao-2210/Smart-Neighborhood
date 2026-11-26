import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  AnnouncementPriority,
  EventRegistrationStatus,
  EventStatus,
} from '@todanpho/shared';

export class AnnouncementQueryDto {
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
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPinned?: boolean;
}

export class CreateAnnouncementDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ enum: AnnouncementPriority, default: AnnouncementPriority.NORMAL })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority = AnnouncementPriority.NORMAL;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean = false;
}

export class EventQueryDto {
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
  @IsEnum(EventStatus)
  status?: EventStatus;
}

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  locationName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty()
  @IsDateString()
  startTime!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxAttendees?: number;
}

export class EventRegisterDto {
  @ApiProperty({ enum: [EventRegistrationStatus.REGISTERED, EventRegistrationStatus.CANCELLED] })
  @IsIn([EventRegistrationStatus.REGISTERED, EventRegistrationStatus.CANCELLED])
  status!: EventRegistrationStatus;
}

export class RegisterDeviceTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ enum: ['ios', 'android'] })
  @IsIn(['ios', 'android'])
  platform!: 'ios' | 'android';
}

