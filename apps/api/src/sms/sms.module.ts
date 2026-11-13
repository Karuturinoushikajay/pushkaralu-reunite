import { Global, Module } from '@nestjs/common';
import { MockSmsProvider } from './mock-sms.provider';
import { SMS_PROVIDER } from './sms.provider';

@Global()
@Module({
  providers: [
    MockSmsProvider,
    {
      provide: SMS_PROVIDER,
      useExisting: MockSmsProvider,
    },
  ],
  exports: [SMS_PROVIDER, MockSmsProvider],
})
export class SmsModule {}
