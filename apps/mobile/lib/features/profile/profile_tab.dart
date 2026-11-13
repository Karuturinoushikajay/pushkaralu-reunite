import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';
import '../../theme/app_theme.dart';

class ProfileTab extends ConsumerStatefulWidget {
  const ProfileTab({super.key});

  @override
  ConsumerState<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends ConsumerState<ProfileTab> {
  String _lang = 'en';

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            session.uid ?? 'Profile',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          const Text('Family account', style: TextStyle(color: AppColors.muted)),
          const SizedBox(height: 16),
          const Text('Language', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              for (final e in const [('en', 'English'), ('te', 'Telugu'), ('hi', 'Hindi')])
                ChoiceChip(
                  label: Text(e.$2),
                  selected: _lang == e.$1,
                  onSelected: (_) => setState(() => _lang = e.$1),
                ),
            ],
          ),
          const ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text('Offline maps'),
            subtitle: Text('Rajamahendravaram, 48 MB'),
            trailing: Icon(Icons.map_outlined),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Offline maps'),
            subtitle: const Text('Download / manage'),
            onTap: () => context.push('/map-download'),
          ),
          const ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text('Emergency contacts'),
            subtitle: Text('2 saved'),
          ),
          const ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text('Privacy and consent'),
            subtitle: Text('View or withdraw face recognition / reunification'),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Wristband QR'),
            subtitle: const Text('Print / save'),
            onTap: () {
              final uid = session.uid;
              if (uid != null) context.push('/member/$uid/qr');
            },
          ),
          const SizedBox(height: 12),
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
