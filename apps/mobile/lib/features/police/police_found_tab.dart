import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';

final foundReportsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get('/found-reports');
  if (res is List) return res;
  if (res is Map && res['value'] is List) return res['value'] as List;
  return const [];
});

class PoliceFoundTab extends ConsumerWidget {
  const PoliceFoundTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final found = ref.watch(foundReportsProvider);
    return SafeArea(
      child: found.when(
        data: (list) => ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text('Found persons', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            if (list.isEmpty) const Text('No open found reports'),
            for (final f in list)
              Card(
                child: ListTile(
                  title: Text('${f['scannedUid'] ?? f['id']}'),
                  subtitle: Text('${f['clothing'] ?? ''} · ${f['status'] ?? ''}'),
                  onTap: () => context.push('/police/register-case'),
                ),
              ),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
      ),
    );
  }
}
