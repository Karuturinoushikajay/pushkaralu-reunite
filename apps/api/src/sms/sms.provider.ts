export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

export interface SendSmsInput {
  to: string;
  body: string;
}

/**
 * SMS delivery behind an interface. Production plugs in Twilio/MSG91; local and
 * CI use the mock provider which never sends a real message.
 */
export interface SmsProvider {
  send(input: SendSmsInput): Promise<void>;
}
