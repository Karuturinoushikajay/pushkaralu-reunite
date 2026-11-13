import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';
import '../../theme/app_theme.dart';
import 'auth_repository.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
  final _aadhaar = TextEditingController();
  final _emergency = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _consent = false;
  bool _loading = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Name *')),
          const SizedBox(height: 12),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Own phone *', hintText: '+91 XXXXX XXXXX'),
          ),
          const SizedBox(height: 12),
          TextField(controller: _address, decoration: const InputDecoration(labelText: 'Address *')),
          const SizedBox(height: 12),
          TextField(
            controller: _aadhaar,
            maxLength: 12,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Aadhaar number (12 digits) *',
              hintText: 'XXXX XXXX XXXX',
            ),
          ),
          TextField(
            controller: _emergency,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Emergency phone *'),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF4E5),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Live photo *', style: TextStyle(fontWeight: FontWeight.w700)),
                SizedBox(height: 4),
                Text('Tap to open camera on the next step. Used for face recognition to help find you if you are ever lost (after approval).'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          TextField(controller: _password, obscureText: true, decoration: const InputDecoration(labelText: 'Password *')),
          const SizedBox(height: 12),
          TextField(controller: _confirm, obscureText: true, decoration: const InputDecoration(labelText: 'Confirm password *')),
          CheckboxListTile(
            value: _consent,
            onChanged: (v) => setState(() => _consent = v ?? false),
            title: const Text('I agree to share my family details for reunification purposes only'),
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: EdgeInsets.zero,
          ),
          if (_error != null) Text(_error!, style: const TextStyle(color: AppColors.alert)),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _loading || !_consent ? null : _submit,
            child: Text(_loading ? '…' : 'Submit'),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    final aadhaar = _aadhaar.text.replaceAll(RegExp(r'\D'), '');
    if (aadhaar.length != 12) {
      setState(() => _error = 'Enter a valid 12-digit Aadhaar number');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final repo = AuthRepository(ref.read(apiClientProvider));
      final res = await repo.register({
        'name': _name.text.trim(),
        'ownPhone': _phone.text.trim(),
        'address': _address.text.trim(),
        'aadhaarNumber': aadhaar,
        'emergencyPhone': _emergency.text.trim(),
        'photoKey': 'photos/pending-${DateTime.now().millisecondsSinceEpoch}.jpg',
        'password': _password.text,
        'confirmPassword': _confirm.text,
        'preferredLanguage': 'en',
        'reunificationConsent': true,
        'faceConsentAccepted': false,
      });
      if (!mounted) return;
      context.push('/verify-otp', extra: {
        'challengeId': res['challengeId'],
        'maskedPhone': res['maskedPhone'],
        'debugCode': res['debugCode'],
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
