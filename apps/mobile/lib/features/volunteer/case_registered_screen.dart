import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';
import '../../theme/app_theme.dart';

class CaseRegisteredScreen extends ConsumerStatefulWidget {
  const CaseRegisteredScreen({super.key, required this.payload});
  final Map<String, dynamic> payload;

  @override
  ConsumerState<CaseRegisteredScreen> createState() => _CaseRegisteredScreenState();
}

class _CaseRegisteredScreenState extends ConsumerState<CaseRegisteredScreen> {
  bool _loading = false;
  String? _error;

  Future<void> _boothSuccess() async {
    final caseId = widget.payload['caseId'] as String?;
    if (caseId == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/cases/$caseId/handover/booth-success', {'note': 'Handed to booth'});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Handover to booth: success')),
      );
      context.go('/volunteer');
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final booth = widget.payload['booth'] as Map<String, dynamic>?;
    final meters = booth?['distanceMeters'];
    return Scaffold(
      appBar: AppBar(title: const Text('Case registered')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: const Color(0xFFE8F6EE), borderRadius: BorderRadius.circular(12)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Case ${widget.payload['memberUid']} registered',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
                  ),
                  const SizedBox(height: 8),
                  const Text('Family app shows a highlighted alert'),
                  Text('${booth?['code'] ?? 'Booth'} has been alerted'),
                  const Chip(label: Text('SENT'), backgroundColor: Color(0xFFD7F0E3)),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text('Next steps', style: TextStyle(fontWeight: FontWeight.w700)),
            const Text('1. Stay with the person, stay visible'),
            Text('2. Walk to ${booth?['code'] ?? 'booth'}${meters != null ? ' ($meters m)' : ''}'),
            const SizedBox(height: 16),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AppColors.amber, foregroundColor: AppColors.navy),
              onPressed: () {},
              child: Text('Navigate to ${booth?['code'] ?? 'booth'}'),
            ),
            const SizedBox(height: 8),
            if (_error != null) Text(_error!, style: const TextStyle(color: AppColors.alert)),
            FilledButton(
              onPressed: _loading ? null : _boothSuccess,
              child: Text(_loading ? '…' : 'Handover to booth: success'),
            ),
          ],
        ),
      ),
    );
  }
}
