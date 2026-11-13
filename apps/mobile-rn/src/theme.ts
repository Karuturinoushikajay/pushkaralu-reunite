import { I18N_KEYS, type I18nKey } from '@pushkaralu/shared';

export const colors = {
  navy: '#12263F',
  amber: '#E8A33D',
  alert: '#B42318',
  success: '#1B7F4B',
  background: '#F4F6F8',
  cream: '#FFF8EC',
  muted: '#5B6B7C',
  white: '#FFFFFF',
  border: '#D7DEE7',
  warningBg: '#FFF4E5',
  alertBg: '#FDECEB',
  successBg: '#E8F6EE',
};

/** Card colors by reunification case status. */
export function caseStatusColors(status: string | null | undefined): { bg: string; fg: string } {
  switch (status) {
    case 'MISSING':
      return { bg: colors.alertBg, fg: colors.alert };
    case 'FOUND':
    case 'MATCHED':
      return { bg: colors.warningBg, fg: '#9A6700' };
    case 'REUNITED':
      return { bg: colors.successBg, fg: colors.success };
    default:
      return { bg: colors.white, fg: colors.navy };
  }
}

/** English labels for police/volunteer ops UI. */
export function caseStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'MISSING':
      return 'MISSING — search in progress';
    case 'FOUND':
      return 'FOUND — take to booth (not collected yet)';
    case 'MATCHED':
      return 'AT BOOTH — family OTP to collect';
    case 'REUNITED':
      return 'REUNITED — collected (OTP verified)';
    default:
      return 'Safe';
  }
}

/** User-facing status line via i18n `t`. Name/UID stay untranslated elsewhere. */
export function caseStatusLabelI18n(
  status: string | null | undefined,
  t: (key: I18nKey) => string,
): string {
  switch (status) {
    case 'MISSING':
      return t(I18N_KEYS.statusMissingDetail);
    case 'FOUND':
      return t(I18N_KEYS.statusFoundDetail);
    case 'MATCHED':
      return t(I18N_KEYS.statusMatchedDetail);
    case 'REUNITED':
      return t(I18N_KEYS.statusReunitedDetail);
    default:
      return t(I18N_KEYS.statusSafe);
  }
}
