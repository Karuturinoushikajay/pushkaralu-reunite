import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  pilgrimSearchInputSchema,
  type PilgrimSearchInput,
} from '@pushkaralu/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PilgrimSearchService } from './pilgrim-search.service';

@Controller('search')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PilgrimSearchController {
  constructor(private readonly search: PilgrimSearchService) {}

  @Post('pilgrims')
  @Roles('VOLUNTEER', 'POLICE')
  pilgrims(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(pilgrimSearchInputSchema)) body: PilgrimSearchInput,
  ) {
    return this.search.search(user, body);
  }

  @Get('pilgrims/:uid/family')
  @Roles('VOLUNTEER', 'POLICE')
  family(@CurrentUser() user: JwtPayload, @Param('uid') uid: string) {
    return this.search.familyContacts(user, uid);
  }
}
