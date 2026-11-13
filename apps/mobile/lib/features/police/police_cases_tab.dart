import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';
import '../../theme/app_theme.dart';

final policeCasesProvider = FutureProvider.family<List<dynamic>, String?>((ref, status) async {
  final api = ref.watch(apiClientProvider);
  final q = status == null || status == 'All' ? '' : '?status=${status.toUpperCase()}';
  final res = await api.get('/cases$q');
  if (res is List) return res;
  if (res is Map && res['value'] is List) return res['value'] as List;
  return const [];
});

class PoliceCasesTab extends ConsumerStatefulWidget {
  const PoliceCasesTab({super.key});

  @override
  ConsumerState<PoliceCasesTab> createState() => _PoliceCasesTabState();
}

class _PoliceCasesTabState extends ConsumerState<PoliceCasesTab> {
  String _filter = 'All';

  @override
  Widget build(BuildContext context) {
    final cases = ref.watch(policeCasesProvider(_filter == 'All' ? null : _filter));
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
            child: Text('Open cases · Booth 07', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Wrap(
              spacing: 8,
              children: [
                for (final f in ['All', 'Missing', 'Found'])
                  ChoiceChip(
                    label: Text(f),
                    selected: _filter == f,
                    onSelected: (_) => setState(() => _filter = f),
                  ),
              ],
            ),
          ),
          Expanded(
            child: cases.when(
              data: (list) => ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: list.length,
                itemBuilder: (_, i) {
                  final c = list[i] as Map<String, dynamic>;
                  final status = c['status'] as String? ?? '';
                  return Card(
                    color: status == 'MISSING' ? const Color(0xFFFDECEB) : Colors.white,
                    child: ListTile(
                      title: Text('${c['memberUid']}'),
                      subtitle: Text('${c['lastSeenLabel'] ?? ''} · ${c['reportedAt'] ?? ''}'),
                      trailing: Chip(
                        label: Text(status),
                        backgroundColor: status == 'FOUND' ? const Color(0xFFE8F6EE) : const Color(0xFFFDECEB),
                      ),
                      onTap: () => context.push('/case/${c['id']}'),
                    ),
                  );
                },
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppColors.alert))),
            ),
          ),
        ],
      ),
    );
  }
}
