import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  bool _handled = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan wristband QR')),
      body: MobileScanner(
        onDetect: (capture) {
          if (_handled) return;
          if (capture.barcodes.isEmpty) return;
          final value = capture.barcodes.first.rawValue;
          if (value == null || value.isEmpty) return;
          _handled = true;
          context.pushReplacement('/volunteer/log-found', extra: value);
        },
      ),
    );
  }
}
