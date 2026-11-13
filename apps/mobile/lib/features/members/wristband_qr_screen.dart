import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/session.dart';
import '../../theme/app_theme.dart';

class WristbandQrScreen extends ConsumerStatefulWidget {
  const WristbandQrScreen({super.key, required this.uid});
  final String uid;

  @override
  ConsumerState<WristbandQrScreen> createState() => _WristbandQrScreenState();
}

class _WristbandQrScreenState extends ConsumerState<WristbandQrScreen> {
  Map<String, dynamic>? _qr;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/members/${widget.uid}/qr') as Map<String, dynamic>;
      if (mounted) setState(() => _qr = res);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Wristband QR')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Text(widget.uid, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            const Text('QR encodes the UID only — no personal data. Print or save for children and elders without a phone.'),
            const SizedBox(height: 24),
            if (_error != null) Text(_error!, style: const TextStyle(color: AppColors.alert)),
            if (_qr == null && _error == null) const CircularProgressIndicator(),
            if (_qr != null) ...[
              if ((_qr!['pngBase64'] as String?)?.isNotEmpty == true)
                Image.memory(base64Decode(_qr!['pngBase64'] as String), width: 240, height: 240)
              else
                Container(
                  width: 240,
                  height: 240,
                  alignment: Alignment.center,
                  color: const Color(0xFFE8EEF4),
                  child: Text(_qr!['payload']?.toString() ?? widget.uid),
                ),
              const SizedBox(height: 12),
              Text('Payload: ${_qr!['payload']}', style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
          ],
        ),
      ),
    );
  }
}
