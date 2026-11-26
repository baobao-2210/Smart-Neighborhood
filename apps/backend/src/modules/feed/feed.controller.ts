import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/auth.decorators';
import { FeedService, RequestUserContext } from './feed.service';
import {
  CreateCommentDto,
  CreatePostDto,
  FeedQueryDto,
  ReportPostDto,
  ToggleReactionDto,
  UpdatePostDto,
} from './dto/feed.dto';

@ApiTags('Feed (Module 1)')
@ApiBearerAuth()
@Controller('api/v1/posts')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  private toContext(user: AuthenticatedUser): RequestUserContext {
    return {
      userId: user.id,
      neighborhoodId: user.neighborhoodId,
      role: user.role,
    };
  }

  @Get()
  getPosts(
    @Query() query: FeedQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.feedService.getPosts(query, this.toContext(user));
  }

  @Get(':id')
  getPostById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.feedService.getPostById(id, this.toContext(user));
  }

  @Post()
  createPost(
    @Body() dto: CreatePostDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.feedService.createPost(dto, this.toContext(user));
  }

  @Patch(':id')
  updatePost(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.feedService.updatePost(id, dto, this.toContext(user));
  }

  @Post(':id/reactions')
  toggleReaction(
    @Param('id') id: string,
    @Body() dto: ToggleReactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.feedService.toggleReaction(id, dto, this.toContext(user));
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.feedService.addComment(id, dto, this.toContext(user));
  }

  @Post(':id/report')
  reportPost(
    @Param('id') id: string,
    @Body() dto: ReportPostDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.feedService.reportPost(id, dto, this.toContext(user));
  }

  @Patch(':id/pin')
  togglePin(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.feedService.togglePin(id, this.toContext(user));
  }

  @Delete(':id')
  deletePost(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.feedService.deletePost(id, this.toContext(user));
  }
}
