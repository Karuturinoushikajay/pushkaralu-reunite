import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthPrincipal } from '../crypto/token.service';
import { TokenService } from '../crypto/token.service';

export interface AuthedRequest {
  header(name: string): string | undefined;
  user?: AuthPrincipal;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.header('authorization') ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match?.[1]) {
      throw new UnauthorizedException('Missing bearer token');
    }
    try {
      req.user = this.tokens.verify(match[1]);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return true;
  }
}

export function currentUser(req: AuthedRequest): AuthPrincipal {
  if (!req.user) {
    throw new UnauthorizedException('Missing bearer token');
  }
  return req.user;
}
