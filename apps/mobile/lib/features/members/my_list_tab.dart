import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';
import '../../theme/app_theme.dart';
import '../home/home_tab.dart';

class MyListTab extends ConsumerWidget {
  const MyListTab({super.key});

  Color? _rowColor(String? status) {
    if (status == 'MISSING') return const Color(0xFFFDECEB);
    if (status == 'FOUND' || status == 'MATCHED') return const Color(0xFFFFF4E5);
    return Colors.white;
  }

  String _statusLabel(Map m) {
    final status = m['caseStatus'] as String?;
    final name = m['name'] ?? '';
    if (status == 'FOUND' || status == 'MATCHED') {
      return '$name — FOUND, go to Booth 07';
    }
    if (status == 'MISSING') return '$name — Missing';
    return '$name${m['isSelf'] == true ? '' : ''} · Safe';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final members = ref.watch(membersProvider);
    final session = ref.watch(sessionProvider);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('My List', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
            const Text('Tap (i) for details'),
            const SizedBox(height: 16),
            Expanded(
              child: members.when(
                data: (list) => ListView(
                  children: [
                    for (final m in list)
                      Card(
                        color: _rowColor(m['caseStatus'] as String?),
                        child: ListTile(
                          title: Text(
                            '${m['isSelf'] == true ? 'Self  ' : ''}${m['uid']}',
                            style: TextStyle(
                              color: m['caseStatus'] == 'MISSING' ||
                                      m['caseStatus'] == 'FOUND' ||
                                      m['caseStatus'] == 'MATCHED'
                                  ? AppColors.alert
                                  : AppColors.navy,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          subtitle: Text(_statusLabel(m)),
                          trailing: IconButton(
                            icon: const Icon(Icons.info_outline),
                            onPressed: () {
                              final caseId = m['caseId'] as String?;
                              if (caseId != null &&
                                  (m['caseStatus'] == 'FOUND' || m['caseStatus'] == 'MATCHED')) {
                                context.push('/case/$caseId');
                              } else {
                                context.push('/member/${m['uid']}');
                              }
                            },
                          ),
                        ),
                      ),
                  ],
                ),
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(child: Text('$e')),
              ),
            ),
            OutlinedButton(onPressed: () => context.push('/add-member'), child: const Text('+ Add member')),
            const SizedBox(height: 8),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AppColors.amber, foregroundColor: AppColors.navy),
              onPressed: () {
                final uid = session.uid;
                if (uid != null) context.push('/member/$uid/qr');
              },
              child: const Text('Show wristband QR'),
            ),
          ],
        ),
      ),
    );
  }
}
