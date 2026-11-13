import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  addMemberInputSchema,
  type AddMemberInput,
} from '@pushkaralu/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MembersService } from './members.service';

@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @Roles('USER')
  list(@CurrentUser() user: JwtPayload) {
    return this.members.listForAccount(user);
  }

  @Post()
  @Roles('USER')
  add(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(addMemberInputSchema)) body: AddMemberInput,
  ) {
    return this.members.add(user, body);
  }

  @Get(':uid')
  @Roles('USER')
  getOne(@CurrentUser() user: JwtPayload, @Param('uid') uid: string) {
    return this.members.getOne(user, uid);
  }

  @Get(':uid/qr')
  @Roles('USER')
  qr(@CurrentUser() user: JwtPayload, @Param('uid') uid: string) {
    return this.members.wristbandQr(user, uid);
  }
}
