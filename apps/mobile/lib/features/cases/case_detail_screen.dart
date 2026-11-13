import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/session.dart';
import '../../theme/app_theme.dart';

class CaseDetailScreen extends ConsumerWidget {
  const CaseDetailScreen({super.key, required this.caseId});
  final String caseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FutureBuilder(
      future: ref.read(apiClientProvider).get('/cases/$caseId'),
      builder: (context, snap) {
        if (!snap.hasData) {
          return Scaffold(
            appBar: AppBar(title: const Text('Case')),
            body: Center(child: snap.hasError ? Text('${snap.error}') : const CircularProgressIndicator()),
          );
        }
        final c = snap.data as Map<String, dynamic>;
        final booth = c['nearestBooth'] as Map<String, dynamic>?;
        final found = c['status'] == 'FOUND' || c['status'] == 'MATCHED' || c['status'] == 'REUNITED';

        return Scaffold(
          appBar: AppBar(title: Text(booth != null ? '${booth['code']} details' : 'Case details')),
          body: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: found ? const Color(0xFFE8F6EE) : const Color(0xFFFDECEB),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: found ? AppColors.success : AppColors.alert,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(c['status'] as String, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                      const SizedBox(height: 8),
                      Text(booth != null ? '${booth['code']}, ${booth['name']}' : 'Searching nearby booths…'),
                      Text('Officer: ${booth?['officerName'] ?? '—'}'),
                      Text('Status: ${found ? 'Child found, safe' : 'Police are searching'}'),
                      if (booth?['distanceMeters'] != null)
                        Text('${booth!['distanceMeters']} m to booth'),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  height: 180,
                  decoration: BoxDecoration(color: const Color(0xFFE8EEF4), borderRadius: BorderRadius.circular(12)),
                  alignment: Alignment.center,
                  child: Text(
                    booth == null
                        ? 'Route appears when a booth is assigned'
                        : 'Route to ${booth['code']} · ${booth['distanceMeters']} m',
                  ),
                ),
                const Spacer(),
                FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: AppColors.amber, foregroundColor: AppColors.navy),
                  onPressed: booth == null ? null : () {},
                  child: const Text('Navigate to booth'),
                ),
                const SizedBox(height: 8),
                OutlinedButton(onPressed: () {}, child: const Text('Call booth')),
              ],
            ),
          ),
        );
      },
    );
  }
}
