import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  foundReportInputSchema,
  type FoundReportInput,
} from '@pushkaralu/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { FoundReportsService } from './found-reports.service';

@Controller('found-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FoundReportsController {
  constructor(private readonly found: FoundReportsService) {}

  @Post()
  @Roles('VOLUNTEER', 'POLICE')
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(foundReportInputSchema)) body: FoundReportInput,
  ) {
    return this.found.create(user, body);
  }

  @Get()
  @Roles('POLICE', 'VOLUNTEER')
  list() {
    return this.found.listOpen();
  }

  @Get(':id/matches')
  @Roles('POLICE', 'VOLUNTEER')
  matches(@Param('id') id: string) {
    return this.found.matches(id);
  }
}
