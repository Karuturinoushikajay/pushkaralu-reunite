import { SetMetadata } from '@nestjs/common';
import type { JwtPayload } from './auth.types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Array<JwtPayload['role']>) => SetMetadata(ROLES_KEY, roles);
