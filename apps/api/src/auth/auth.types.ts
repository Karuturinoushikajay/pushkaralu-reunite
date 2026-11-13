export interface JwtPayload {
  sub: string;
  role: 'USER' | 'VOLUNTEER' | 'POLICE';
  uid: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface RegistrationPendingResponse {
  challengeId: string;
  expiresAt: string;
  maskedPhone: string;
  /** Present only with the mock SMS provider. */
  debugCode?: string;
}

export interface AccountReadyResponse {
  accountId: string;
  uid: string;
  role: 'USER' | 'VOLUNTEER' | 'POLICE';
  tokens: AuthTokens;
  wristbandQr: {
    payload: string;
    pngBase64: string;
  };
}
