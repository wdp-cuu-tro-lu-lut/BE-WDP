import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AccountRole } from '@/database/entities';

type SocketUser = {
  sub: string;
  role: AccountRole;
  email?: string;
  phone?: string;
};

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync<SocketUser>(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      client.data.user = {
        id: payload.sub,
        role: payload.role,
      };

      client.join(this.getRoleRoom(payload.role));
      client.join('role:authenticated');

      this.logger.debug(
        `Socket connected: ${client.id}, role=${payload.role}, user=${payload.sub}`,
      );
    } catch (error) {
      this.logger.warn(`Socket auth failed for ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('notifications.ping')
  handlePing(
    @ConnectedSocket() client: Socket,
    @MessageBody() body?: Record<string, unknown>,
  ) {
    return {
      event: 'notifications.pong',
      data: {
        ok: true,
        ts: new Date().toISOString(),
        clientId: client.id,
        echo: body ?? null,
      },
    };
  }

  emitToStaffAndAdmin(event: string, payload: unknown) {
    this.server.to(this.getRoleRoom(AccountRole.STAFF)).emit(event, payload);
    this.server.to(this.getRoleRoom(AccountRole.ADMIN)).emit(event, payload);
  }

  getConnectionStats() {
    return {
      namespace: '/realtime',
      totalClients: this.server.sockets.sockets.size,
      adminClients:
        this.server.sockets.adapter.rooms.get(this.getRoleRoom(AccountRole.ADMIN))
          ?.size ?? 0,
      staffClients:
        this.server.sockets.adapter.rooms.get(this.getRoleRoom(AccountRole.STAFF))
          ?.size ?? 0,
      authenticatedClients:
        this.server.sockets.adapter.rooms.get('role:authenticated')?.size ?? 0,
    };
  }

  private getRoleRoom(role: AccountRole) {
    return `role:${role}`;
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim() !== '') {
      return authToken.replace(/^Bearer\s+/i, '').trim();
    }

    const authorization = client.handshake.headers.authorization;
    if (typeof authorization === 'string' && authorization.trim() !== '') {
      return authorization.replace(/^Bearer\s+/i, '').trim();
    }

    return null;
  }
}