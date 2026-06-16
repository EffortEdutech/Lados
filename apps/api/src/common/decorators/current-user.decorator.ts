import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import type { AuthenticatedRequest } from '../types/authenticated-request';

/**
 * @CurrentUser() — extracts the authenticated Supabase user from the request.
 *
 * Must be used on routes protected by SupabaseJwtGuard.
 *
 * @example
 *   @Get('me')
 *   @UseGuards(SupabaseJwtGuard)
 *   getMe(@CurrentUser() user: User) {
 *     return user;
 *   }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
