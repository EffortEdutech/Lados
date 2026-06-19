import { Controller, Get, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@UseGuards(SupabaseJwtGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /** GET /api/v1/notifications — all notifications for the current user */
  @Get()
  async getAll(@Req() req: AuthenticatedRequest) {
    const data = await this.notificationService.getAll(req.user.id);
    return { data };
  }

  /** GET /api/v1/notifications/unread — unread only */
  @Get('unread')
  async getUnread(@Req() req: AuthenticatedRequest) {
    const data = await this.notificationService.getUnread(req.user.id);
    return { data, unread_count: data.length };
  }

  /** PATCH /api/v1/notifications/:id/read */
  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    await this.notificationService.markRead(id, req.user.id);
    return { data: { ok: true } };
  }

  /** PATCH /api/v1/notifications/read-all */
  @Patch('read-all')
  async markAllRead(@Req() req: AuthenticatedRequest) {
    await this.notificationService.markAllRead(req.user.id);
    return { data: { ok: true } };
  }
}
