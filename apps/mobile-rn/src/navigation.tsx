import React from 'react';
import { NavigationContainer, type NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from './auth';
import { I18N_KEYS, useI18n } from './i18n';
import { colors } from './theme';
import { Loading } from './ui';

import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { VerifyOtpScreen } from './screens/VerifyOtpScreen';
import { AccountReadyScreen } from './screens/AccountReadyScreen';
import { MapDownloadScreen } from './screens/MapDownloadScreen';
import { HomeTab } from './screens/user/HomeTab';
import { NewsTab } from './screens/user/NewsTab';
import { MyListTab } from './screens/user/MyListTab';
import { ProfileTab } from './screens/user/ProfileTab';
import { BoothsTab } from './screens/user/BoothsTab';
import { AddMemberScreen } from './screens/user/AddMemberScreen';
import { MemberDetailScreen } from './screens/user/MemberDetailScreen';
import { CaseDetailScreen } from './screens/user/CaseDetailScreen';
import { WristbandQrScreen } from './screens/user/WristbandQrScreen';
import { VolunteerLoginScreen } from './screens/volunteer/VolunteerLoginScreen';
import { VolunteerCreateCredentialsScreen } from './screens/volunteer/VolunteerCreateCredentialsScreen';
import { VolunteerHomeScreen } from './screens/volunteer/VolunteerHomeScreen';
import { FindPersonScreen } from './screens/volunteer/FindPersonScreen';
import { FamilyCallScreen } from './screens/volunteer/FamilyCallScreen';
import { CaseRegisteredScreen } from './screens/volunteer/CaseRegisteredScreen';
import { ScanQrScreen } from './screens/volunteer/ScanQrScreen';
import { PoliceCasesTab } from './screens/police/PoliceCasesTab';
import { PoliceMapTab } from './screens/police/PoliceMapTab';
import { PoliceAlertsTab } from './screens/police/PoliceAlertsTab';
import { PoliceProfileTab } from './screens/police/PoliceProfileTab';
import { PoliceRegisterCaseScreen } from './screens/police/PoliceRegisterCaseScreen';
import { PoliceCaseDetailScreen } from './screens/police/PoliceCaseDetailScreen';
import { PoliceLoginScreen } from './screens/police/PoliceLoginScreen';
import { PoliceCreateCredentialsScreen } from './screens/police/PoliceCreateCredentialsScreen';
import { PoliceBoothScreen } from './screens/police/PoliceBoothScreen';

export type UserTabParamList = {
  Home: undefined;
  News: undefined;
  MyList: undefined;
  Booths: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  PoliceLogin: undefined;
  PoliceCreateCredentials: undefined;
  VerifyOtp: { challengeId: string; maskedPhone: string; debugCode?: string };
  AccountReady: {
    uid: string;
    wristbandQr?: { payload: string; pngBase64: string };
    faceConsentAccepted?: boolean;
  };
  MapDownload: undefined;
  UserTabs: NavigatorScreenParams<UserTabParamList> | undefined;
  AddMember: undefined;
  MemberDetail: { uid: string };
  CaseDetail: { caseId: string };
  WristbandQr: { uid: string };
  VolunteerLogin: undefined;
  VolunteerCreateCredentials: undefined;
  VolunteerHome: undefined;
  FindPerson: undefined;
  FamilyCall: {
    hit: { uid: string; name: string; familyCode: string; caseStatus: string | null; faceMatchScore?: number };
  };
  CaseRegistered: { payload: Record<string, unknown> };
  ScanQr: undefined;
  PoliceTabs: undefined;
  PoliceRegisterCase: undefined;
  PoliceCaseDetail: { caseId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const UserTabsNav = createBottomTabNavigator<UserTabParamList>();
const PoliceTabsNav = createBottomTabNavigator();

/** Built-in glyphs — no Ionicons font download (fonts time out over tunnel). */
function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ color: focused ? colors.amber : colors.muted, fontSize: 11 }}>{label}</Text>;
}

function TabGlyph({ glyph, focused }: { glyph: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 18,
        lineHeight: 22,
        color: focused ? colors.amber : colors.muted,
        fontWeight: focused ? '700' : '500',
      }}
    >
      {glyph}
    </Text>
  );
}

function tabGlyph(glyph: string) {
  return ({ focused }: { focused: boolean }) => <TabGlyph glyph={glyph} focused={focused} />;
}

const userTabScreenOptions = {
  headerShown: false,
  lazy: true,
  tabBarActiveTintColor: colors.amber,
  tabBarInactiveTintColor: colors.muted,
  tabBarStyle: { backgroundColor: colors.white, height: 58, paddingBottom: 4, paddingTop: 4 },
  tabBarHideOnKeyboard: true,
} as const;

function UserTabs() {
  const { t } = useI18n();
  return (
    <UserTabsNav.Navigator
      detachInactiveScreens
      screenOptions={userTabScreenOptions}
    >
      <UserTabsNav.Screen
        name="Home"
        component={HomeTab}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label={t(I18N_KEYS.tabHome)} focused={focused} />,
          tabBarIcon: tabGlyph('⌂'),
        }}
      />
      <UserTabsNav.Screen
        name="News"
        component={NewsTab}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label={t(I18N_KEYS.tabNews)} focused={focused} />,
          tabBarIcon: tabGlyph('☰'),
        }}
      />
      <UserTabsNav.Screen
        name="MyList"
        component={MyListTab}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label={t(I18N_KEYS.tabMyList)} focused={focused} />,
          tabBarIcon: tabGlyph('≡'),
        }}
      />
      <UserTabsNav.Screen
        name="Booths"
        component={BoothsTab}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label={t(I18N_KEYS.tabBooths)} focused={focused} />,
          tabBarIcon: tabGlyph('◉'),
        }}
      />
      <UserTabsNav.Screen
        name="Profile"
        component={ProfileTab}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label={t(I18N_KEYS.tabProfile)} focused={focused} />,
          tabBarIcon: tabGlyph('☺'),
        }}
      />
    </UserTabsNav.Navigator>
  );
}

function PoliceTabs() {
  return (
    <PoliceTabsNav.Navigator
      detachInactiveScreens
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.white, height: 58, paddingBottom: 4, paddingTop: 4 },
        tabBarHideOnKeyboard: true,
      }}
    >
      <PoliceTabsNav.Screen
        name="Booth"
        component={PoliceBoothScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="Booth" focused={focused} />,
          tabBarIcon: tabGlyph('⌂'),
        }}
      />
      <PoliceTabsNav.Screen
        name="Cases"
        component={PoliceCasesTab}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="Cases" focused={focused} />,
          tabBarIcon: tabGlyph('▣'),
        }}
      />
      <PoliceTabsNav.Screen
        name="Map"
        component={PoliceMapTab}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="Map" focused={focused} />,
          tabBarIcon: tabGlyph('◎'),
        }}
      />
      <PoliceTabsNav.Screen
        name="Alerts"
        component={PoliceAlertsTab}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="Alerts" focused={focused} />,
          tabBarIcon: tabGlyph('!'),
        }}
      />
      <PoliceTabsNav.Screen
        name="Profile"
        component={PoliceProfileTab}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="Profile" focused={focused} />,
          tabBarIcon: tabGlyph('☺'),
        }}
      />
    </PoliceTabsNav.Navigator>
  );
}

export function RootNavigator() {
  const { ready, token, role } = useAuth();
  if (!ready) return <Loading />;

  const authed = Boolean(token);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerTintColor: colors.navy }}>
        {!authed ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create account' }} />
            <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} options={{ title: 'Verify phone' }} />
            <Stack.Screen name="VolunteerLogin" component={VolunteerLoginScreen} options={{ title: 'Volunteer login' }} />
            <Stack.Screen
              name="VolunteerCreateCredentials"
              component={VolunteerCreateCredentialsScreen}
              options={{ title: 'Create volunteer credentials' }}
            />
            <Stack.Screen name="PoliceLogin" component={PoliceLoginScreen} options={{ title: 'Police login' }} />
            <Stack.Screen
              name="PoliceCreateCredentials"
              component={PoliceCreateCredentialsScreen}
              options={{ title: 'Create police credentials' }}
            />
          </>
        ) : role === 'VOLUNTEER' ? (
          <>
            <Stack.Screen name="VolunteerHome" component={VolunteerHomeScreen} options={{ title: 'Volunteer' }} />
            <Stack.Screen name="FindPerson" component={FindPersonScreen} options={{ title: 'Register case' }} />
            <Stack.Screen name="FamilyCall" component={FamilyCallScreen} options={{ title: 'Family & call' }} />
            <Stack.Screen name="CaseRegistered" component={CaseRegisteredScreen} options={{ title: 'Case registered' }} />
            <Stack.Screen name="ScanQr" component={ScanQrScreen} options={{ title: 'Scan QR' }} />
            <Stack.Screen name="CaseDetail" component={CaseDetailScreen} options={{ title: 'Case' }} />
          </>
        ) : role === 'POLICE' ? (
          <>
            <Stack.Screen name="PoliceTabs" component={PoliceTabs} options={{ headerShown: false }} />
            <Stack.Screen name="PoliceRegisterCase" component={PoliceRegisterCaseScreen} options={{ title: 'Register case' }} />
            <Stack.Screen name="PoliceCaseDetail" component={PoliceCaseDetailScreen} options={{ title: 'Case' }} />
            <Stack.Screen name="FamilyCall" component={FamilyCallScreen} options={{ title: 'Family & call' }} />
            <Stack.Screen name="CaseRegistered" component={CaseRegisteredScreen} options={{ title: 'Case registered' }} />
            <Stack.Screen name="ScanQr" component={ScanQrScreen} options={{ title: 'Scan QR' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="UserTabs" component={UserTabs} options={{ headerShown: false }} />
            <Stack.Screen name="AccountReady" component={AccountReadyScreen} options={{ title: 'Account ready' }} />
            <Stack.Screen name="MapDownload" component={MapDownloadScreen} options={{ title: 'Offline map' }} />
            <Stack.Screen name="AddMember" component={AddMemberScreen} options={{ title: 'Add member' }} />
            <Stack.Screen name="MemberDetail" component={MemberDetailScreen} options={{ title: 'Member' }} />
            <Stack.Screen name="CaseDetail" component={CaseDetailScreen} options={{ title: 'Booth details' }} />
            <Stack.Screen name="WristbandQr" component={WristbandQrScreen} options={{ title: 'Wristband QR' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
