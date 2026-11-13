import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';

class SessionState {
  const SessionState({this.token, this.uid, this.role});
  final String? token;
  final String? uid;
  final String? role;
  bool get isLoggedIn => token != null && token!.isNotEmpty;
}

class SessionNotifier extends StateNotifier<SessionState> {
  SessionNotifier(this._api) : super(const SessionState()) {
    _restore();
  }

  final ApiClient _api;

  Future<void> _restore() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    final uid = prefs.getString('uid');
    final role = prefs.getString('role');
    if (token != null) {
      _api.accessToken = token;
      state = SessionState(token: token, uid: uid, role: role);
    }
  }

  Future<void> save({required String token, required String uid, required String role}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
    await prefs.setString('uid', uid);
    await prefs.setString('role', role);
    _api.accessToken = token;
    state = SessionState(token: token, uid: uid, role: role);
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    _api.accessToken = null;
    state = const SessionState();
  }
}

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

final sessionProvider = StateNotifierProvider<SessionNotifier, SessionState>((ref) {
  return SessionNotifier(ref.watch(apiClientProvider));
});
