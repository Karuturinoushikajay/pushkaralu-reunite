import { describe, expect, it } from 'vitest';
import { QrService } from './qr.service';

describe('QrService', () => {
  it('encodes only the UID in the QR payload', async () => {
    const qr = new QrService();
    const result = await qr.forUid('K7M2-01');
    expect(result.payload).toBe('K7M2-01');
    expect(result.pngBase64.length).toBeGreaterThan(100);
    // PNG magic header in base64 starts with iVBOR
    expect(result.pngBase64.startsWith('iVBOR')).toBe(true);
  });

  it('rejects payloads that would leak personal data', async () => {
    const qr = new QrService();
    await expect(qr.forUid('Ravi|+91')).rejects.toThrow();
  });
});
