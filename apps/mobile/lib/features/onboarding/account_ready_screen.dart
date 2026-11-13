import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../theme/app_theme.dart';

class AccountReadyScreen extends StatelessWidget {
  const AccountReadyScreen({super.key, required this.payload});

  final Map<String, dynamic> payload;

  @override
  Widget build(BuildContext context) {
    final uid = payload['uid'] as String? ?? '';
    final qrPayload = payload['wristbandQr']?['payload'] as String? ?? uid;
    final png = payload['wristbandQr']?['pngBase64'] as String?;

    return Scaffold(
      appBar: AppBar(title: const Text('Account ready')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.navy),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Your unique ID: $uid', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                        const Text('Password: set by you'),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: AppColors.success, borderRadius: BorderRadius.circular(6)),
                    child: const Text('VERIFIED', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text('Wristband QR (print or save)', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Center(
              child: png != null
                  ? Image.memory(base64Decode(png), width: 220, height: 220)
                  : QrImageView(data: qrPayload, size: 220, eyeStyle: const QrEyeStyle(color: AppColors.navy)),
            ),
            const SizedBox(height: 8),
            const Text('Children and elders without a phone wear this. Any volunteer can scan it.', textAlign: TextAlign.center),
            const Spacer(),
            FilledButton(
              onPressed: () => context.go('/map-download'),
              child: const Text('Continue to map download'),
            ),
          ],
        ),
      ),
    );
  }
}
