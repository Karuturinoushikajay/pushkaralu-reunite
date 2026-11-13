import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme/app_theme.dart';

class MatchScreen extends StatelessWidget {
  const MatchScreen({super.key, required this.payload});
  final Map<String, dynamic> payload;

  @override
  Widget build(BuildContext context) {
    final matches = (payload['matches'] as List? ?? []).cast<Map<String, dynamic>>();
    final top = matches.isNotEmpty ? matches.first : null;

    return Scaffold(
      appBar: AppBar(title: const Text('Possible match')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (top != null)
              Card(
                child: ListTile(
                  title: Text('Case ${top['memberUid']}'),
                  subtitle: Text((top['reasons'] as List?)?.join(' · ') ?? ''),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    color: AppColors.alert,
                    child: const Text('MISSING', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
              )
            else
              const Text('No strong match yet. Escort to Booth 07 for officer review.'),
            const SizedBox(height: 16),
            const Text('Next steps', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            _step('1', 'Keep the child with you and stay visible'),
            _step('2', 'Family is notified with your booth location'),
            _step('3', 'Walk to Booth 07 on the map'),
            _step('4', 'Guardian shows an OTP to complete handover'),
            Container(
              margin: const EdgeInsets.symmetric(vertical: 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: const Color(0xFFFFF4E5), borderRadius: BorderRadius.circular(8)),
              child: const Text('Never hand over without the guardian OTP or police approval.'),
            ),
            OutlinedButton(onPressed: () {}, child: const Text('Notify family now')),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: () {}, child: const Text('Navigate to Booth 07')),
            const Spacer(),
            FilledButton(onPressed: () => context.go('/volunteer'), child: const Text('Handed over to police')),
          ],
        ),
      ),
    );
  }

  Widget _step(String n, String text) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFD7DEE7))),
      child: Text('$n. $text'),
    );
  }
}
