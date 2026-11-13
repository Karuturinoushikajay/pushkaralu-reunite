import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { nearbyQuerySchema } from '@pushkaralu/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayload } from '../auth/auth.types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { BoothsService } from './booths.service';

@Controller('booths')
export class BoothsController {
  constructor(private readonly booths: BoothsService) {}

  /** Unauthenticated — booth codes for create-police-credentials. */
  @Get('directory')
  directory() {
    return this.booths.directory();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('POLICE')
  me(@CurrentUser() user: JwtPayload) {
    return this.booths.allocatedForAccount(user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list() {
    return this.booths.list();
  }

  @Get('nearest')
  @UseGuards(JwtAuthGuard)
  nearest(@Query(new ZodValidationPipe(nearbyQuerySchema)) query: { lng: number; lat: number }) {
    return this.booths.nearest(query.lng, query.lat);
  }
}
