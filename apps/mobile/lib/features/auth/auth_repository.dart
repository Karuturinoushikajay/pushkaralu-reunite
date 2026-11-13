import '../../core/api_client.dart';

class AuthRepository {
  AuthRepository(this._api);
  final ApiClient _api;

  Future<Map<String, dynamic>> login(String loginUid, String password) {
    return _api.post('/auth/login', {'loginUid': loginUid, 'password': password});
  }

  Future<Map<String, dynamic>> register(Map<String, dynamic> body) {
    return _api.post('/auth/register', body);
  }

  Future<Map<String, dynamic>> verifyOtp(String challengeId, String code) {
    return _api.post('/auth/verify-otp', {'challengeId': challengeId, 'code': code});
  }

  Future<Map<String, dynamic>> volunteerRequestOtp(String volunteerCode) {
    return _api.post('/auth/volunteer/request-otp', {'volunteerCode': volunteerCode});
  }

  Future<Map<String, dynamic>> volunteerVerifyOtp(String challengeId, String code) {
    return _api.post('/auth/volunteer/verify-otp', {'challengeId': challengeId, 'code': code});
  }
}
