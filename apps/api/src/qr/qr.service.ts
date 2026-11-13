import { Injectable } from '@nestjs/common';
import { qrPayloadFromUid } from '@pushkaralu/shared';
import * as QRCode from 'qrcode';

export interface WristbandQr {
  /** Exact bytes/string encoded in the QR — UID only, no personal data. */
  payload: string;
  /** PNG as base64 (no data: URI prefix) for save/print on mobile. */
  pngBase64: string;
}

/**
 * Wristband QR generation. The QR encodes the member UID only so a scan never
 * leaks name, phone, or photo.
 */
@Injectable()
export class QrService {
  async forUid(uid: string): Promise<WristbandQr> {
    const payload = qrPayloadFromUid(uid);
    const pngBase64 = await QRCode.toBuffer(payload, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 512,
      color: { dark: '#12263F', light: '#FFFFFF' },
    }).then((buf) => buf.toString('base64'));

    return { payload, pngBase64 };
  }
}
