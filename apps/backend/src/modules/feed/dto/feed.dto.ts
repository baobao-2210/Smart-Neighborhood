import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PostCategory, PostVisibility } from '@todanpho/shared';

export class FeedQueryDto {
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
  @IsIn(['ALL', 'OFFICIAL', 'LIFE', 'WARNING', 'PINNED'])
  filter?: 'ALL' | 'OFFICIAL' | 'LIFE' | 'WARNING' | 'PINNED' = 'ALL';

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsString()
  @MinLength(2, { message: 'Nội dung bài viết quá ngắn' })
  @MaxLength(5000, { message: 'Nội dung tối đa 5000 ký tự' })
  content!: string;

  @IsOptional()
  @IsEnum(PostCategory)
  category?: PostCategory = PostCategory.LIFE;

  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility = PostVisibility.PUBLIC;

  @IsOptional()
  @IsBoolean()
  isOfficial?: boolean;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationName?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];
}

export class CreateCommentDto {
  @IsString()
  @MinLength(1, { message: 'Bình luận không được để trống' })
  @MaxLength(1500, { message: 'Bình luận tối đa 1500 ký tự' })
  content!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class ToggleReactionDto {
  @IsIn(['LIKE', 'HEART', 'CLAP'])
  type!: 'LIKE' | 'HEART' | 'CLAP';
}
