import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';
import '../../theme/app_theme.dart';
import 'auth_repository.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _uid = TextEditingController();
  final _password = TextEditingController();
  String? _error;
  bool _loading = false;
  String _lang = 'en';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 24),
              const CircleAvatar(radius: 36, backgroundColor: AppColors.navy, child: Text('PR', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
              const SizedBox(height: 16),
              Text('Pushkaralu Reunite', textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 32),
              TextField(controller: _uid, decoration: const InputDecoration(labelText: 'Unique ID', hintText: 'K7M2-01')),
              const SizedBox(height: 12),
              TextField(controller: _password, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: AppColors.alert)),
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _loading ? null : _login,
                child: Text(_loading ? '…' : 'Login'),
              ),
              TextButton(onPressed: () => context.push('/register'), child: const Text('Create account')),
              TextButton(onPressed: () => context.push('/volunteer-login'), child: const Text('Volunteer login')),
              const Spacer(),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (final code in ['en', 'te', 'hi'])
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: ChoiceChip(
                        label: Text(code == 'en' ? 'English' : code == 'te' ? 'Telugu' : 'Hindi'),
                        selected: _lang == code,
                        onSelected: (_) => setState(() => _lang = code),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _login() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final repo = AuthRepository(api);
      final res = await repo.login(_uid.text.trim(), _password.text);
      await ref.read(sessionProvider.notifier).save(
            token: res['tokens']['accessToken'] as String,
            uid: res['uid'] as String,
            role: res['role'] as String,
          );
      if (!mounted) return;
      final role = res['role'] as String;
      if (role == 'VOLUNTEER') {
        context.go('/volunteer');
      } else if (role == 'POLICE') {
        context.go('/police');
      } else {
        context.go('/home');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
