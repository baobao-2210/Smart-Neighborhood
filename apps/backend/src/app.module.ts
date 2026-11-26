import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { NeighborhoodScopeGuard } from './common/guards/neighborhood-scope.guard';
import { AuditModule } from './modules/audit/audit.module';
import { UploadModule } from './modules/upload/upload.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FeedModule } from './modules/feed/feed.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ResidentsModule } from './modules/residents/residents.module';
import { MapModule } from './modules/map/map.module';
import { ConnectModule } from './modules/connect/connect.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    DatabaseModule,
    AuditModule,
    UploadModule,
    AuthModule,
    UsersModule,
    FeedModule,
    ReportsModule,
    NotificationModule,
    ResidentsModule,
    MapModule,
    ConnectModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: NeighborhoodScopeGuard },
  ],
})
export class AppModule {}
