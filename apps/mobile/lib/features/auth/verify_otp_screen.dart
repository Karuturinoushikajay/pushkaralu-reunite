import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';
import '../../theme/app_theme.dart';
import 'auth_repository.dart';

class VerifyOtpScreen extends ConsumerStatefulWidget {
  const VerifyOtpScreen({
    super.key,
    required this.challengeId,
    required this.maskedPhone,
    this.debugCode,
  });

  final String challengeId;
  final String maskedPhone;
  final String? debugCode;

  @override
  ConsumerState<VerifyOtpScreen> createState() => _VerifyOtpScreenState();
}

class _VerifyOtpScreenState extends ConsumerState<VerifyOtpScreen> {
  final _code = TextEditingController();
  bool _faceConsent = false;
  bool _photoTaken = false;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.debugCode != null) _code.text = widget.debugCode!;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verify phone')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('OTP sent to ${widget.maskedPhone}'),
          const SizedBox(height: 16),
          TextField(
            controller: _code,
            keyboardType: TextInputType.number,
            maxLength: 6,
            decoration: const InputDecoration(labelText: '6-digit OTP'),
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: _loading ? null : _verifyOnly,
            child: Text(_loading ? '…' : 'Verify'),
          ),
          const SizedBox(height: 24),
          Text('Live photo', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          const Text('Take a clear face photo. Used for face recognition to help find you if you are ever lost.'),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => setState(() => _photoTaken = true),
            icon: Icon(_photoTaken ? Icons.check_circle : Icons.camera_alt, color: _photoTaken ? AppColors.success : null),
            label: Text(_photoTaken ? 'Photo captured' : 'Tap to open camera'),
          ),
          CheckboxListTile(
            value: _faceConsent,
            onChanged: (v) => setState(() => _faceConsent = v ?? false),
            title: const Text(
              'I agree to face recognition and sharing family details for reunification only',
            ),
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: EdgeInsets.zero,
          ),
          if (_error != null) Text(_error!, style: const TextStyle(color: AppColors.alert)),
          const SizedBox(height: 8),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.amber, foregroundColor: AppColors.navy),
            onPressed: _loading || !_photoTaken ? null : _finish,
            child: const Text('Finish'),
          ),
        ],
      ),
    );
  }

  Future<void> _verifyOnly() => _complete(requirePhoto: false);

  Future<void> _finish() => _complete(requirePhoto: true);

  Future<void> _complete({required bool requirePhoto}) async {
    if (requirePhoto && !_photoTaken) {
      setState(() => _error = 'Capture a live photo to finish');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final repo = AuthRepository(ref.read(apiClientProvider));
      final res = await repo.verifyOtp(widget.challengeId, _code.text.trim());
      await ref.read(sessionProvider.notifier).save(
            token: res['tokens']['accessToken'] as String,
            uid: res['uid'] as String,
            role: res['role'] as String,
          );
      if (!mounted) return;
      context.go('/account-ready', extra: {
        ...res,
        'faceConsentAccepted': _faceConsent,
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
