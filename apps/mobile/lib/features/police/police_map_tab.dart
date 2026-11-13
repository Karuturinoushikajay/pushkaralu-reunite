import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'police_cases_tab.dart';

class PoliceMapTab extends ConsumerWidget {
  const PoliceMapTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cases = ref.watch(policeCasesProvider(null));
    return SafeArea(
      child: cases.when(
        data: (list) => Column(
          children: [
            Expanded(
              child: Container(
                margin: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: const Color(0xFFD9E8F5), borderRadius: BorderRadius.circular(12)),
                alignment: Alignment.center,
                child: Text('${list.length} case pins · live map'),
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  for (final c in list)
                    ListTile(
                      title: Text('${(c as Map)['memberUid']}'),
                      subtitle: Text('${c['lastSeenLabel'] ?? c['status']}'),
                    ),
                ],
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
