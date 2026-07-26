import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import type { SecretEnvelope } from './connection.types';

@Injectable()
export class ConnectionCryptoService {
  constructor(private readonly config: ConfigService) {}

  encrypt(value: Record<string, unknown>): SecretEnvelope {
    const key = this.getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return {
      version: 1,
      algorithm: 'aes-256-gcm',
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      ciphertext: ciphertext.toString('base64'),
    };
  }

  decrypt(envelope: SecretEnvelope): Record<string, unknown> {
    if (envelope.version !== 1 || envelope.algorithm !== 'aes-256-gcm') {
      throw new ServiceUnavailableException('Unsupported connection secret envelope');
    }
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.getKey(), Buffer.from(envelope.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
        decipher.final(),
      ]);
      return JSON.parse(plaintext.toString('utf8')) as Record<string, unknown>;
    } catch {
      throw new ServiceUnavailableException('Connection credentials cannot be decrypted');
    }
  }

  private getKey(): Buffer {
    const raw = this.config.get<string>('LADOS_CONNECTION_ENCRYPTION_KEY')?.trim();
    if (!raw) throw new ServiceUnavailableException('Connection credential encryption is not configured');
    const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
    if (key.length !== 32) {
      throw new ServiceUnavailableException('Connection credential encryption key must contain 32 bytes');
    }
    return key;
  }
}

