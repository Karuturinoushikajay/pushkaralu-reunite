import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/session.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/register_screen.dart';
import 'features/auth/verify_otp_screen.dart';
import 'features/cases/case_detail_screen.dart';
import 'features/home/home_shell.dart';
import 'features/members/add_member_screen.dart';
import 'features/members/member_detail_screen.dart';
import 'features/members/wristband_qr_screen.dart';
import 'features/onboarding/account_ready_screen.dart';
import 'features/onboarding/map_download_screen.dart';
import 'features/police/police_register_case_screen.dart';
import 'features/police/police_shell.dart';
import 'features/volunteer/case_registered_screen.dart';
import 'features/volunteer/family_call_screen.dart';
import 'features/volunteer/find_person_screen.dart';
import 'features/volunteer/log_found_screen.dart';
import 'features/volunteer/match_screen.dart';
import 'features/volunteer/scan_screen.dart';
import 'features/volunteer/volunteer_home_screen.dart';
import 'features/volunteer/volunteer_login_screen.dart';

String homeForRole(String? role) {
  switch (role) {
    case 'VOLUNTEER':
      return '/volunteer';
    case 'POLICE':
      return '/police';
    default:
      return '/home';
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final session = ref.watch(sessionProvider);

  return GoRouter(
    initialLocation: session.isLoggedIn ? homeForRole(session.role) : '/login',
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(
        path: '/verify-otp',
        builder: (_, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return VerifyOtpScreen(
            challengeId: extra['challengeId'] as String? ?? '',
            maskedPhone: extra['maskedPhone'] as String? ?? '',
            debugCode: extra['debugCode'] as String?,
          );
        },
      ),
      GoRoute(
        path: '/account-ready',
        builder: (_, state) => AccountReadyScreen(payload: state.extra as Map<String, dynamic>? ?? {}),
      ),
      GoRoute(path: '/map-download', builder: (_, __) => const MapDownloadScreen()),
      GoRoute(path: '/home', builder: (_, __) => const HomeShell()),
      GoRoute(path: '/add-member', builder: (_, __) => const AddMemberScreen()),
      GoRoute(
        path: '/member/:uid',
        builder: (_, state) => MemberDetailScreen(uid: state.pathParameters['uid']!),
      ),
      GoRoute(
        path: '/member/:uid/qr',
        builder: (_, state) => WristbandQrScreen(uid: state.pathParameters['uid']!),
      ),
      GoRoute(
        path: '/case/:id',
        builder: (_, state) => CaseDetailScreen(caseId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/volunteer-login', builder: (_, __) => const VolunteerLoginScreen()),
      GoRoute(path: '/volunteer', builder: (_, __) => const VolunteerHomeScreen()),
      GoRoute(path: '/volunteer/find', builder: (_, __) => const FindPersonScreen()),
      GoRoute(path: '/volunteer/scan', builder: (_, __) => const ScanScreen()),
      GoRoute(
        path: '/volunteer/log-found',
        builder: (_, state) => LogFoundScreen(scannedUid: state.extra as String?),
      ),
      GoRoute(
        path: '/volunteer/match',
        builder: (_, state) => MatchScreen(payload: state.extra as Map<String, dynamic>? ?? {}),
      ),
      GoRoute(
        path: '/volunteer/family-call',
        builder: (_, state) => FamilyCallScreen(hit: state.extra as Map<String, dynamic>? ?? {}),
      ),
      GoRoute(
        path: '/volunteer/case-registered',
        builder: (_, state) =>
            CaseRegisteredScreen(payload: state.extra as Map<String, dynamic>? ?? {}),
      ),
      GoRoute(path: '/police', builder: (_, __) => const PoliceShell()),
      GoRoute(path: '/police/register-case', builder: (_, __) => const PoliceRegisterCaseScreen()),
    ],
  );
});
