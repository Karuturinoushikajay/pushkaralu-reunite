import { Injectable, Logger } from '@nestjs/common';
import type { SendSmsInput, SmsProvider } from './sms.provider';

/**
 * Dev/test SMS provider. Logs the message (including OTP) so engineers can
 * complete flows without a real SMS gateway. Never use in production.
 */
@Injectable()
export class MockSmsProvider implements SmsProvider {
  private readonly logger = new Logger(MockSmsProvider.name);
  /** Captured messages for unit tests. */
  readonly sent: SendSmsInput[] = [];

  async send(input: SendSmsInput): Promise<void> {
    this.sent.push(input);
    this.logger.log(`[mock-sms] to=${input.to} body=${input.body}`);
  }
}
