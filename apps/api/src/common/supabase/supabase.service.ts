import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

/**
 * SupabaseService — server-side Supabase admin client.
 *
 * Uses the SERVICE ROLE key — bypasses RLS.
 * Authorization must be enforced manually in the service layer.
 *
 * NEVER expose this client or the service role key to the browser.
 */
@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    this.client = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  /** Admin client — bypasses RLS. Use with care. */
  get admin(): SupabaseClient {
    return this.client;
  }

  /**
   * Verify a Supabase JWT and return the authenticated user.
   * Returns null if the token is invalid or expired.
   */
  async verifyJwt(token: string): Promise<User | null> {
    const {
      data: { user },
      error,
    } = await this.client.auth.getUser(token);

    if (error ?? !user) return null;
    return user;
  }
}
