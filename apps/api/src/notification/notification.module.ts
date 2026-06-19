import { Global, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';

/**
 * NotificationModule — Sprint 14 (S14-004)
 * Global so NotificationService can be injected anywhere (e.g. human_approval node).
 */
@Global()
@Module({
  providers:   [NotificationService],
  controllers: [NotificationController],
  exports:     [NotificationService],
})
export class NotificationModule {}
