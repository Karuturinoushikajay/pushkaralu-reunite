import AsyncStorage from '@react-native-async-storage/async-storage';

const MUTE_KEY = 'pr_alert_muted';
const SEEN_KEY = 'pr_alert_seen_case_ids';

export async function getAlertMuted(): Promise<boolean> {
  return (await AsyncStorage.getItem(MUTE_KEY)) === '1';
}

export async function setAlertMuted(muted: boolean): Promise<void> {
  await AsyncStorage.setItem(MUTE_KEY, muted ? '1' : '0');
}

/** Known case IDs so we don't re-alert after app restart for old cases. */
export async function getSeenCaseIds(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(SEEN_KEY);
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export async function rememberSeenCaseIds(ids: Iterable<string>): Promise<void> {
  const next = [...new Set(ids)].slice(-200);
  await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(next));
}
