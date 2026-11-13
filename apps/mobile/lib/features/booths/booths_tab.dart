import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/session.dart';

class BoothsTab extends ConsumerWidget {
  const BoothsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FutureBuilder(
      future: ref.read(apiClientProvider).get('/booths'),
      builder: (context, snap) {
        if (!snap.hasData) {
          return Center(child: snap.hasError ? Text('${snap.error}') : const CircularProgressIndicator());
        }
        final booths = (snap.data as List).cast<Map<String, dynamic>>();
        return SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Text('Booths', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              for (final b in booths)
                Card(
                  child: ListTile(
                    title: Text('${b['code']} · ${b['name']}'),
                    subtitle: Text('Officer: ${b['officerName'] ?? '—'}'),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
