import type { Request } from 'express';
import type { User } from '@supabase/supabase-js';

/**
 * Express Request augmented with the authenticated Supabase user.
 * Set by SupabaseJwtGuard on every protected route.
 */
export interface AuthenticatedRequest extends Request {
  user: User;
}
