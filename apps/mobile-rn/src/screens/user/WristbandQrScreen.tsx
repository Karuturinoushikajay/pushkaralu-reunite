import React, { useEffect, useState } from 'react';
import { Image, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../../api';
import { I18N_KEYS, useI18n } from '../../i18n';
import { colors } from '../../theme';
import { ErrorText, Loading, Screen, Title } from '../../ui';
import type { RootStackParamList } from '../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'WristbandQr'>;

export function WristbandQrScreen({ route }: Props) {
  const { uid } = route.params;
  const { t } = useI18n();
  const [qr, setQr] = useState<{ payload: string; pngBase64: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<{ payload: string; pngBase64: string }>(`/members/${uid}/qr`)
      .then(setQr)
      .catch((e) => setError((e as Error).message));
  }, [uid]);

  if (!qr && !error) return <Loading />;

  return (
    <Screen>
      <Title>{t(I18N_KEYS.wristbandTitle)}</Title>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 8 }}>{uid}</Text>
      <Text style={{ color: colors.muted, marginBottom: 16 }}>{t(I18N_KEYS.wristbandHint)}</Text>
      <ErrorText message={error} />
      {qr?.pngBase64 ? (
        <Image
          source={{ uri: `data:image/png;base64,${qr.pngBase64}` }}
          style={{ width: 240, height: 240, alignSelf: 'center' }}
        />
      ) : null}
      {qr ? (
        <Text style={{ textAlign: 'center', marginTop: 12, fontWeight: '600' }}>
          {t(I18N_KEYS.wristbandPayload)}: {qr.payload}
        </Text>
      ) : null}
    </Screen>
  );
}
