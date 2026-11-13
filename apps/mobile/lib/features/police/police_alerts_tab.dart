import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../home/home_tab.dart';

class PoliceAlertsTab extends ConsumerWidget {
  const PoliceAlertsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notices = ref.watch(noticesProvider);
    return SafeArea(
      child: notices.when(
        data: (list) => ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text('Alerts', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            for (final n in list)
              Card(
                child: ListTile(
                  title: Text('${(n as Map)['title']?['en'] ?? n['title'] ?? 'Notice'}'),
                  subtitle: Text('${n['body']?['en'] ?? n['severity'] ?? ''}'),
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
