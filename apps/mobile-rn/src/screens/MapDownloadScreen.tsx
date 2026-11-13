import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { Field, PrimaryButton, Screen, Title } from '../ui';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'MapDownload'>;

export function MapDownloadScreen({ navigation }: Props) {
  const [district, setDistrict] = useState('East Godavari');
  const [stateName, setStateName] = useState('Andhra Pradesh');
  const [place, setPlace] = useState('Rajamahendravaram');
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  async function download() {
    setDone(false);
    for (let i = 1; i <= 10; i++) {
      await new Promise((r) => setTimeout(r, 120));
      setProgress(i / 10);
    }
    setDone(true);
  }

  return (
    <Screen>
      <Title>Download offline map</Title>
      <Text style={{ color: colors.muted, marginBottom: 12 }}>Works even when the network is weak at the ghat.</Text>
      <Field value={district} onChangeText={setDistrict} placeholder="District" />
      <Field value={stateName} onChangeText={setStateName} placeholder="State" />
      <Field value={place} onChangeText={setPlace} placeholder="Place" />
      <View
        style={{
          height: 140,
          backgroundColor: '#D9E8F5',
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Text>Map preview · Kotilingala Ghat</Text>
      </View>
      <PrimaryButton label="Download" tone="amber" onPress={download} />
      {progress > 0 ? (
        <Text style={{ marginTop: 8 }}>
          {done ? 'Done · 48 MB saved' : `Downloading… ${Math.round(progress * 100)}% (48 MB)`}
        </Text>
      ) : null}
      <PrimaryButton label="Next" onPress={() => navigation.replace('UserTabs')} disabled={!done} />
    </Screen>
  );
}
