import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@todanpho/shared';
import {
  AuthenticatedUser,
  CurrentUser,
  Roles,
} from '../../common/decorators/auth.decorators';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import {
  CreateConversationDto,
  MessageQueryDto,
  ModerateMessageDto,
  ReportMessageDto,
  SendMessageDto,
} from './dto/chat.dto';

@ApiTags('Community Connect & Chat (Module 5)')
@ApiBearerAuth()
@Controller('api/v1')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('contacts')
  getContacts(
    @Query('search') search: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.getNeighborhoodContacts(user, search);
  }

  @Get('conversations')
  getMyConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.getMyConversations(user);
  }

  @Post('conversations')
  createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.createConversation(dto, user);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @Param('id') conversationId: string,
    @Query() query: MessageQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.getMessages(conversationId, query, user);
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const msg = await this.chatService.sendMessage(conversationId, dto, user);
    this.chatGateway.server
      ?.to(`conversation:${conversationId}`)
      .emit('server:new_message', msg);
    return msg;
  }

  @Post('messages/:id/report')
  reportMessage(
    @Param('id') messageId: string,
    @Body() dto: ReportMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.reportMessage(messageId, dto, user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.LEADER)
  @Patch('messages/:id/moderate')
  moderateMessage(
    @Param('id') messageId: string,
    @Body() dto: ModerateMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.moderateMessage(messageId, dto, user);
  }
}

