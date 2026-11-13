import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  ApiClient({this.baseUrl = const String.fromEnvironment('API_BASE', defaultValue: 'http://10.0.2.2:3000')});

  final String baseUrl;
  String? accessToken;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (accessToken != null) 'Authorization': 'Bearer $accessToken',
      };

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: _headers,
      body: jsonEncode(body),
    );
    return _decode(res);
  }

  Future<dynamic> get(String path) async {
    final res = await http.get(Uri.parse('$baseUrl$path'), headers: _headers);
    return _decode(res);
  }

  dynamic _decode(http.Response res) {
    final body = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode >= 400) {
      final message = body is Map ? (body['message']?.toString() ?? 'Request failed') : 'Request failed';
      throw ApiException(res.statusCode, message);
    }
    return body;
  }
}

class ApiException implements Exception {
  ApiException(this.status, this.message);
  final int status;
  final String message;
  @override
  String toString() => message;
}
