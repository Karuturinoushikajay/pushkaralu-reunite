import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_repository.dart';

class VolunteerLoginScreen extends ConsumerStatefulWidget {
  const VolunteerLoginScreen({super.key});

  @override
  ConsumerState<VolunteerLoginScreen> createState() => _VolunteerLoginScreenState();
}

class _VolunteerLoginScreenState extends ConsumerState<VolunteerLoginScreen> {
  final _code = TextEditingController(text: 'VOL-0214');
  final _otp = TextEditingController();
  String? _challengeId;
  String? _debug;
  String? _error;
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Volunteer login')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const CircleAvatar(radius: 28, backgroundColor: AppColors.success, child: Text('VOL.', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
            const SizedBox(height: 16),
            TextField(controller: _code, decoration: const InputDecoration(labelText: 'Volunteer ID', hintText: 'VOL-0214')),
            const SizedBox(height: 12),
            if (_challengeId != null)
              TextField(controller: _otp, keyboardType: TextInputType.number, maxLength: 6, decoration: const InputDecoration(labelText: 'Phone OTP')),
            Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: const Color(0xFFFFF4E5), borderRadius: BorderRadius.circular(8)),
              child: const Text('Only police-approved volunteers can access found-person data.'),
            ),
            if (_debug != null) Text('Dev OTP: $_debug', style: const TextStyle(color: AppColors.muted)),
            if (_error != null) Text(_error!, style: const TextStyle(color: AppColors.alert)),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AppColors.success),
              onPressed: _loading ? null : (_challengeId == null ? _request : _verify),
              child: Text(_loading ? '…' : (_challengeId == null ? 'Send OTP' : 'Login')),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _request() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await AuthRepository(ref.read(apiClientProvider)).volunteerRequestOtp(_code.text.trim());
      setState(() {
        _challengeId = res['challengeId'] as String;
        _debug = res['debugCode'] as String?;
        if (_debug != null) _otp.text = _debug!;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verify() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await AuthRepository(ref.read(apiClientProvider)).volunteerVerifyOtp(_challengeId!, _otp.text.trim());
      await ref.read(sessionProvider.notifier).save(
            token: res['tokens']['accessToken'] as String,
            uid: res['uid'] as String,
            role: res['role'] as String,
          );
      if (!mounted) return;
      context.go('/volunteer');
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
