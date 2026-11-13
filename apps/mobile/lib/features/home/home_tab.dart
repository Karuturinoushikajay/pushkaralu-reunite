import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';
import '../../theme/app_theme.dart';

final membersProvider = FutureProvider.autoDispose((ref) async {
  final api = ref.watch(apiClientProvider);
  final list = await api.get('/members');
  return (list as List).cast<Map<String, dynamic>>();
});

final noticesProvider = FutureProvider.autoDispose((ref) async {
  final api = ref.watch(apiClientProvider);
  final list = await api.get('/notices');
  return (list as List).cast<Map<String, dynamic>>();
});

class HomeTab extends ConsumerWidget {
  const HomeTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final members = ref.watch(membersProvider);
    final notices = ref.watch(noticesProvider);

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(membersProvider);
          ref.invalidate(noticesProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text('Location: Kotilingala Ghat', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: const Color(0xFFFFF4E5), borderRadius: BorderRadius.circular(12)),
              child: notices.when(
                data: (n) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Helpline: 1800-200-7027', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Text(n.isEmpty ? 'Keep wristbands on near the ghat.' : (n.first['title']?['en'] ?? '').toString()),
                  ],
                ),
                loading: () => const Text('Loading notices…'),
                error: (e, _) => Text('Notices unavailable. $e'),
              ),
            ),
            const SizedBox(height: 32),
            members.when(
              data: (list) {
                if (list.isEmpty) {
                  return Column(
                    children: [
                      const SizedBox(height: 48),
                      Text('No added members', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 16),
                      FilledButton(
                        style: FilledButton.styleFrom(backgroundColor: AppColors.amber, foregroundColor: AppColors.navy),
                        onPressed: () => context.push('/add-member'),
                        child: const Text('+ Add Members'),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton(onPressed: () => context.push('/map-download'), child: const Text('Map (offline)')),
                    ],
                  );
                }
                return Column(
                  children: [
                    for (final m in list)
                      ListTile(
                        title: Text('${m['name'] ?? 'Member'} · ${m['uid']}'),
                        subtitle: Text(
                          m['caseStatus'] == 'MISSING'
                              ? 'MISSING'
                              : (m['caseStatus'] == 'FOUND' || m['caseStatus'] == 'MATCHED')
                                  ? 'FOUND — go to booth'
                                  : 'Safe',
                        ),
                        textColor: m['caseStatus'] != null && m['caseStatus'] != 'REUNITED'
                            ? AppColors.alert
                            : null,
                        trailing: IconButton(
                          icon: const Icon(Icons.info_outline),
                          onPressed: () => context.push('/member/${m['uid']}'),
                        ),
                      ),
                  ],
                );
              },
              loading: () => const Padding(padding: EdgeInsets.all(48), child: Center(child: CircularProgressIndicator())),
              error: (e, _) => Column(
                children: [
                  Text('Could not load members.\n$e', textAlign: TextAlign.center),
                  TextButton(onPressed: () => ref.invalidate(membersProvider), child: const Text('Try again')),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
