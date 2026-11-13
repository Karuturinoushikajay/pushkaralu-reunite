import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  boothHandoverSuccessInputSchema,
  handoverVerifyInputSchema,
  manualCloseInputSchema,
  matchCaseInputSchema,
  registerFromFindInputSchema,
  reportMissingInputSchema,
  type BoothHandoverSuccessInput,
  type HandoverVerifyInput,
  type ManualCloseInput,
  type MatchCaseInput,
  type RegisterFromFindInput,
  type ReportMissingInput,
} from '@pushkaralu/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CasesService } from './cases.service';

@Controller('cases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CasesController {
  constructor(private readonly cases: CasesService) {}

  @Post('report-missing')
  @Roles('USER')
  reportMissing(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(reportMissingInputSchema)) body: ReportMissingInput,
  ) {
    return this.cases.reportMissing(user, body);
  }

  @Post('register-from-find')
  @Roles('VOLUNTEER', 'POLICE')
  registerFromFind(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(registerFromFindInputSchema)) body: RegisterFromFindInput,
  ) {
    return this.cases.registerFromFind(user, body);
  }

  @Get('mine')
  @Roles('USER')
  mine(@CurrentUser() user: JwtPayload) {
    return this.cases.listMine(user);
  }

  @Get()
  @Roles('POLICE')
  listAll(@Query('status') status?: string) {
    return this.cases.listAll(status);
  }

  @Get(':id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.cases.getById(id, user);
  }

  @Get(':id/audit')
  @Roles('POLICE')
  audit(@Param('id') id: string) {
    return this.cases.auditForCase(id);
  }

  @Post(':id/mark-found')
  @Roles('POLICE', 'VOLUNTEER')
  markFound(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.cases.markFound(user, id);
  }

  @Post(':id/match')
  @Roles('POLICE')
  match(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(matchCaseInputSchema)) body: MatchCaseInput,
  ) {
    return this.cases.match(user, id, body);
  }

  @Post(':id/alert-volunteers')
  @Roles('POLICE')
  alert(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.cases.alertVolunteers(user, id);
  }

  @Post(':id/handover/start')
  @Roles('POLICE', 'USER')
  startHandover(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.cases.startHandover(user, id);
  }

  @Post(':id/handover/verify')
  @Roles('POLICE', 'USER')
  verifyHandover(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(handoverVerifyInputSchema)) body: HandoverVerifyInput,
  ) {
    return this.cases.verifyHandover(user, id, body);
  }

  @Post(':id/handover/booth-success')
  @Roles('VOLUNTEER', 'POLICE')
  boothSuccess(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(boothHandoverSuccessInputSchema)) body: BoothHandoverSuccessInput,
  ) {
    return this.cases.boothHandoverSuccess(user, id, body);
  }

  @Post(':id/handover/manual-close')
  @Roles('POLICE')
  manualClose(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(manualCloseInputSchema)) body: ManualCloseInput,
  ) {
    return this.cases.manualClose(user, id, body);
  }
}
