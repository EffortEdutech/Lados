import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { AuthenticatedRequest } from '../types/authenticated-request';

/**
 * SupabaseJwtGuard
 *
 * Validates the Bearer token in the Authorization header against Supabase.
 * On success, attaches the Supabase User object to request.user.
 * On failure, throws 401 UnauthorizedException.
 *
 * Usage:
 *   @UseGuards(SupabaseJwtGuard)
 *   @Get('me')
 *   getMe(@CurrentUser() user: User) { ... }
 */
@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authorization header missing or malformed');
    }

    const user = await this.supabase.verifyJwt(token);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.user = user;
    return true;
  }

  private extractToken(request: AuthenticatedRequest): string | null {
    const auth = request.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) return null;
    return auth.slice(7).trim();
  }
}
