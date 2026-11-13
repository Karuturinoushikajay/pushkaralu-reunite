import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';
import '../../theme/app_theme.dart';

final volunteerAlertsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  Position? pos;
  try {
    final permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.always || permission == LocationPermission.whileInUse) {
      pos = await Geolocator.getCurrentPosition();
    }
  } catch (_) {}
  final lng = pos?.longitude ?? 81.7795;
  final lat = pos?.latitude ?? 16.9846;
  final res = await api.get('/volunteer/alerts?lng=$lng&lat=$lat&radiusMeters=2000');
  if (res is List) return res;
  if (res is Map && res['value'] is List) return res['value'] as List;
  return const [];
});

class VolunteerHomeScreen extends ConsumerWidget {
  const VolunteerHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alerts = ref.watch(volunteerAlertsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Duty zone'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(sessionProvider.notifier).clear();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('Ghat 3', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
          const Text('Booth 07 is nearby'),
          const SizedBox(height: 16),
          alerts.when(
            data: (list) {
              if (list.isEmpty) {
                return const Card(child: ListTile(title: Text('No nearby missing alerts')));
              }
              return Column(
                children: [
                  for (final a in list)
                    Card(
                      color: const Color(0xFFFDECEB),
                      child: ListTile(
                        title: Text('Missing: ${a['memberUid'] ?? a['name'] ?? 'Alert'}'),
                        subtitle: Text('${a['lastSeenLabel'] ?? a['note'] ?? ''}'),
                        trailing: const Chip(label: Text('ALERT'), backgroundColor: Color(0xFFF5C6C2)),
                      ),
                    ),
                ],
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Text('$e', style: const TextStyle(color: AppColors.alert)),
          ),
          const SizedBox(height: 24),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
            onPressed: () => context.push('/volunteer/find'),
            child: const Text('Find person'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => context.push('/volunteer/scan'),
            child: const Text('Scan wristband QR'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            style: OutlinedButton.styleFrom(foregroundColor: AppColors.alert),
            onPressed: () {},
            child: const Text('SOS / need help'),
          ),
        ],
      ),
    );
  }
}
