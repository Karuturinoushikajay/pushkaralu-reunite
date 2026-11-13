import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../home/home_tab.dart';
import '../../theme/app_theme.dart';

class NewsTab extends ConsumerWidget {
  const NewsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final members = ref.watch(membersProvider);
    final notices = ref.watch(noticesProvider);
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('News', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          members.when(
            data: (list) {
              final missing = list.where((m) => m['caseStatus'] == 'MISSING').toList();
              return Column(
                children: [
                  for (final m in missing)
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.alert),
                        borderRadius: BorderRadius.circular(12),
                        color: const Color(0xFFFDECEB),
                      ),
                      child: Text('MISSING: ${m['name']}, ${m['uid']}. Police are searching. Stay near the booth.'),
                    ),
                  for (final m in list)
                    ListTile(
                      title: Text('${m['name']} ${m['uid']}'),
                      subtitle: Text(m['caseStatus'] == 'MISSING' ? 'MISSING' : 'Safe'),
                      textColor: m['caseStatus'] == 'MISSING' ? AppColors.alert : null,
                    ),
                ],
              );
            },
            loading: () => const LinearProgressIndicator(),
            error: (e, _) => Text('$e'),
          ),
          const Divider(),
          notices.when(
            data: (n) => Column(
              children: [
                for (final item in n)
                  ListTile(
                    title: Text((item['title']?['en'] ?? '').toString()),
                    subtitle: Text((item['body']?['en'] ?? '').toString()),
                  ),
              ],
            ),
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}
