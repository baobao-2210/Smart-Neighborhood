import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { AuthenticatedUser } from '../../common/decorators/auth.decorators';
import { ChatService } from './chat.service';

@WebSocketGateway({
  namespace: '/ws/chat',
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
      client.data.user = {
        id: payload.sub,
        neighborhoodId: payload.neighborhoodId,
        role: payload.role,
      } as AuthenticatedUser;
      await client.join(`neighborhood:${payload.neighborhoodId}`);
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('client:join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    const user = client.data.user as AuthenticatedUser | undefined;
    if (!user || !body?.conversationId) return;

    await this.chatService.ensureConversationMember(
      body.conversationId,
      user.id,
      user.neighborhoodId,
    );
    await client.join(`conversation:${body.conversationId}`);
    return { joined: body.conversationId };
  }

  @SubscribeMessage('client:send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { conversationId: string; content: string; attachmentUrls?: string[] },
  ) {
    const user = client.data.user as AuthenticatedUser | undefined;
    if (!user || !body?.conversationId || !body?.content?.trim()) return;

    const message = await this.chatService.sendMessage(
      body.conversationId,
      { content: body.content, attachmentUrls: body.attachmentUrls },
      user,
    );

    this.server
      .to(`conversation:${body.conversationId}`)
      .emit('server:new_message', message);

    return message;
  }
}

