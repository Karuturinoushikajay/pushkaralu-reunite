import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme/app_theme.dart';

class MapDownloadScreen extends StatefulWidget {
  const MapDownloadScreen({super.key});

  @override
  State<MapDownloadScreen> createState() => _MapDownloadScreenState();
}

class _MapDownloadScreenState extends State<MapDownloadScreen> {
  final _district = TextEditingController(text: 'East Godavari');
  final _state = TextEditingController(text: 'Andhra Pradesh');
  final _place = TextEditingController(text: 'Rajamahendravaram');
  double _progress = 0;
  bool _done = false;

  @override
  void dispose() {
    _district.dispose();
    _state.dispose();
    _place.dispose();
    super.dispose();
  }

  Future<void> _download() async {
    setState(() {
      _progress = 0;
      _done = false;
    });
    for (var i = 1; i <= 10; i++) {
      await Future<void>.delayed(const Duration(milliseconds: 180));
      if (!mounted) return;
      setState(() => _progress = i / 10);
    }
    setState(() => _done = true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Download offline map')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Works even when the network is weak at the ghat.'),
            const SizedBox(height: 16),
            TextField(controller: _district, decoration: const InputDecoration(labelText: 'District')),
            const SizedBox(height: 12),
            TextField(controller: _state, decoration: const InputDecoration(labelText: 'State')),
            const SizedBox(height: 12),
            TextField(controller: _place, decoration: const InputDecoration(labelText: 'Place')),
            const SizedBox(height: 16),
            Container(
              height: 140,
              decoration: BoxDecoration(color: const Color(0xFFD9E8F5), borderRadius: BorderRadius.circular(12)),
              alignment: Alignment.center,
              child: const Text('Map preview · Kotilingala Ghat'),
            ),
            const SizedBox(height: 16),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AppColors.amber, foregroundColor: AppColors.navy),
              onPressed: _download,
              child: const Text('Download'),
            ),
            if (_progress > 0) ...[
              const SizedBox(height: 12),
              LinearProgressIndicator(value: _progress, color: AppColors.navy, backgroundColor: const Color(0xFFD7DEE7)),
              Text(_done ? 'Done · 48 MB saved' : 'Downloading… ${(_progress * 100).round()}% (48 MB)'),
            ],
            const Spacer(),
            FilledButton(
              onPressed: _done ? () => context.go('/home') : null,
              child: const Text('Next'),
            ),
          ],
        ),
      ),
    );
  }
}
