import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConnectionCryptoService } from './connection-crypto.service';

describe('ConnectionCryptoService', () => {
  const key = Buffer.alloc(32, 7).toString('base64');

  it('round-trips credentials without placing plaintext in the envelope', () => {
    const service = new ConnectionCryptoService({ get: () => key } as unknown as ConfigService);
    const credentials = { apiKey: 'secret-value', refreshToken: 'refresh-value' };
    const envelope = service.encrypt(credentials);

    expect(JSON.stringify(envelope)).not.toContain('secret-value');
    expect(JSON.stringify(envelope)).not.toContain('refresh-value');
    expect(service.decrypt(envelope)).toEqual(credentials);
  });

  it('fails closed when ciphertext is modified', () => {
    const service = new ConnectionCryptoService({ get: () => key } as unknown as ConfigService);
    const envelope = service.encrypt({ apiKey: 'secret-value' });
    envelope.ciphertext = `${envelope.ciphertext.slice(0, -2)}AA`;
    expect(() => service.decrypt(envelope)).toThrow(ServiceUnavailableException);
  });

  it('requires a dedicated 32-byte key', () => {
    const service = new ConnectionCryptoService({ get: () => undefined } as unknown as ConfigService);
    expect(() => service.encrypt({ apiKey: 'secret-value' })).toThrow(ServiceUnavailableException);
  });
});

