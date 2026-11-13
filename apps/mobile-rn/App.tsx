import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MissingAlertProvider } from './src/alerts/MissingAlertWatcher';
import { AuthProvider } from './src/auth';
import { LanguageProvider } from './src/i18n';
import { RootNavigator } from './src/navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <MissingAlertProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </MissingAlertProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
