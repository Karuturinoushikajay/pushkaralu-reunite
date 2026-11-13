import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Role } from '@pushkaralu/shared';

export interface AuthPrincipal {
  accountId: string;
  role: Role;
  loginUid: string;
}

const DEFAULT_TTL_SECONDS = 12 * 60 * 60;

@Injectable()
export class TokenService {
  constructor(private readonly secret: string) {
    if (secret.length < 16) {
      throw new Error('JWT secret must be at least 16 characters');
    }
  }

  sign(principal: AuthPrincipal, ttlSeconds = DEFAULT_TTL_SECONDS): string {
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64url(
      JSON.stringify({
        sub: principal.accountId,
        role: principal.role,
        loginUid: principal.loginUid,
        exp: Math.floor(Date.now() / 1000) + ttlSeconds,
      }),
    );
    const signature = this.mac(`${header}.${body}`);
    return `${header}.${body}.${signature}`;
  }

  verify(token: string): AuthPrincipal {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Malformed token');
    }
    const [header, body, signature] = parts;
    if (!header || !body || !signature) {
      throw new Error('Malformed token');
    }
    const expected = this.mac(`${header}.${body}`);
    const actualBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
      throw new Error('Bad token signature');
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      sub?: string;
      role?: Role;
      loginUid?: string;
      exp?: number;
    };
    if (!payload.sub || !payload.role || !payload.loginUid || typeof payload.exp !== 'number') {
      throw new Error('Malformed token payload');
    }
    if (payload.exp * 1000 <= Date.now()) {
      throw new Error('Token expired');
    }
    if (!Object.values(Role).includes(payload.role)) {
      throw new Error('Unknown role');
    }
    return { accountId: payload.sub, role: payload.role, loginUid: payload.loginUid };
  }

  private mac(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }
}

function base64url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}
