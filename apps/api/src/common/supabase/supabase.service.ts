import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import WebSocket from 'ws';

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
        // Node 20 has no native WebSocket global (that lands in Node 22) — without
        // an explicit transport, @supabase/realtime-js throws synchronously in its
        // constructor, which createClient() always runs even though this
        // server-side admin client never opens a realtime channel.
        realtime: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          transport: WebSocket as any,
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
