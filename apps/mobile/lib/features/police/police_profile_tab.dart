import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';

class PoliceProfileTab extends ConsumerWidget {
  const PoliceProfileTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(session.uid ?? 'Officer', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
          const ListTile(title: Text('Booth'), subtitle: Text('BOOTH-07 · Kotilingala Ghat')),
          const ListTile(title: Text('Role'), subtitle: Text('POLICE')),
          TextButton(
            onPressed: () async {
              await ref.read(sessionProvider.notifier).clear();
              if (context.mounted) context.go('/login');
            },
            child: const Text('Log out'),
          ),
        ],
      ),
    );
  }
}
