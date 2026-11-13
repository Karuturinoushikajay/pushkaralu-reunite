import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  createAccountInputSchema,
  createPoliceCredentialsInputSchema,
  createVolunteerCredentialsInputSchema,
  loginInputSchema,
  verifyOtpInputSchema,
  volunteerRequestOtpInputSchema,
  type CreateAccountInput,
  type CreatePoliceCredentialsInput,
  type CreateVolunteerCredentialsInput,
  type LoginInput,
  type VerifyOtpInput,
  type VolunteerRequestOtpInput,
} from '@pushkaralu/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import type { AccountReadyResponse, RegistrationPendingResponse } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @HttpCode(201)
  register(
    @Body(new ZodValidationPipe(createAccountInputSchema)) body: CreateAccountInput,
  ): Promise<RegistrationPendingResponse> {
    return this.auth.register(body);
  }

  @Post('police/register')
  @HttpCode(201)
  createPoliceCredentials(
    @Body(new ZodValidationPipe(createPoliceCredentialsInputSchema))
    body: CreatePoliceCredentialsInput,
  ): Promise<AccountReadyResponse> {
    return this.auth.createPoliceCredentials(body);
  }

  @Post('volunteer/register')
  @HttpCode(201)
  createVolunteerCredentials(
    @Body(new ZodValidationPipe(createVolunteerCredentialsInputSchema))
    body: CreateVolunteerCredentialsInput,
  ) {
    return this.auth.createVolunteerCredentials(body);
  }

  @Post('verify-otp')
  @HttpCode(200)
  verifyOtp(
    @Body(new ZodValidationPipe(verifyOtpInputSchema)) body: VerifyOtpInput,
  ): Promise<AccountReadyResponse> {
    return this.auth.verifyOtp(body);
  }

  @Post('login')
  @HttpCode(200)
  login(
    @Body(new ZodValidationPipe(loginInputSchema)) body: LoginInput,
  ): Promise<AccountReadyResponse> {
    return this.auth.login(body);
  }

  @Post('volunteer/request-otp')
  @HttpCode(200)
  volunteerRequestOtp(
    @Body(new ZodValidationPipe(volunteerRequestOtpInputSchema))
    body: VolunteerRequestOtpInput,
  ): Promise<RegistrationPendingResponse> {
    return this.auth.requestVolunteerOtp(body);
  }

  @Post('volunteer/verify-otp')
  @HttpCode(200)
  volunteerVerifyOtp(
    @Body(new ZodValidationPipe(verifyOtpInputSchema)) body: VerifyOtpInput,
  ): Promise<AccountReadyResponse> {
    return this.auth.verifyOtp(body);
  }
}
