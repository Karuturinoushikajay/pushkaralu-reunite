import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors } from './theme';
import logoAsset from '../assets/logo.png';

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function BrandLogo({ width = 220 }: { width?: number }) {
  // Transparent-backdrop logo is ~436×575.
  const height = Math.round(width * (575 / 436));
  return (
    <Image
      source={logoAsset}
      accessibilityLabel="Pushkaralu Reunite"
      style={{ width, height, resizeMode: 'contain', alignSelf: 'center' }}
    />
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} />;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  tone = 'navy',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'navy' | 'amber' | 'alert' | 'outline';
}) {
  const bg =
    tone === 'amber'
      ? colors.amber
      : tone === 'alert'
        ? colors.alert
        : tone === 'outline'
          ? colors.white
          : colors.navy;
  const fg = tone === 'amber' || tone === 'outline' ? colors.navy : colors.white;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : 1 },
        tone === 'outline' && { borderWidth: 1, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.navy} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: colors.navy, marginBottom: 8 },
  muted: { color: colors.muted, marginBottom: 12 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    color: colors.navy,
    fontSize: 16,
  },
  btn: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { fontWeight: '700', fontSize: 16 },
  error: { color: colors.alert, marginBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
