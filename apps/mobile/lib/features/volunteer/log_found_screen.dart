import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';
import '../../theme/app_theme.dart';

class LogFoundScreen extends ConsumerStatefulWidget {
  const LogFoundScreen({super.key, this.scannedUid});
  final String? scannedUid;

  @override
  ConsumerState<LogFoundScreen> createState() => _LogFoundScreenState();
}

class _LogFoundScreenState extends ConsumerState<LogFoundScreen> {
  final _clothing = TextEditingController(text: 'Red shirt, blue shorts');
  final _language = TextEditingController(text: 'Telugu');
  String _ageBand = 'CHILD_6_8';
  String _gender = 'MALE';
  bool _loading = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Log found person')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(widget.scannedUid == null ? 'No wristband? Fill in what you see.' : 'Scanned UID: ${widget.scannedUid}'),
          const SizedBox(height: 12),
          DropdownButtonFormField(
            initialValue: _ageBand,
            items: const [
              DropdownMenuItem(value: 'CHILD_6_8', child: Text('6 to 8')),
              DropdownMenuItem(value: 'CHILD_3_5', child: Text('3 to 5')),
              DropdownMenuItem(value: 'CHILD_9_12', child: Text('9 to 12')),
              DropdownMenuItem(value: 'SENIOR_60_PLUS', child: Text('60+')),
            ],
            onChanged: (v) => setState(() => _ageBand = v as String),
            decoration: const InputDecoration(labelText: 'Approx. age'),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField(
            initialValue: _gender,
            items: const [
              DropdownMenuItem(value: 'MALE', child: Text('Boy / Male')),
              DropdownMenuItem(value: 'FEMALE', child: Text('Girl / Female')),
              DropdownMenuItem(value: 'UNKNOWN', child: Text('Unknown')),
            ],
            onChanged: (v) => setState(() => _gender = v as String),
            decoration: const InputDecoration(labelText: 'Gender'),
          ),
          const SizedBox(height: 12),
          TextField(controller: _clothing, decoration: const InputDecoration(labelText: 'Clothing and marks')),
          const SizedBox(height: 12),
          TextField(controller: _language, decoration: const InputDecoration(labelText: 'Language spoken')),
          const SizedBox(height: 12),
          const TextField(enabled: false, decoration: InputDecoration(labelText: 'Location (auto)', hintText: 'GPS on')),
          Container(
            margin: const EdgeInsets.symmetric(vertical: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFFFF4E5), borderRadius: BorderRadius.circular(8)),
            child: const Text('Photo is for police only. No face matching. Guardian consent for minors is noted.'),
          ),
          if (_error != null) Text(_error!, style: const TextStyle(color: AppColors.alert)),
          FilledButton(onPressed: _loading ? null : _submit, child: Text(_loading ? '…' : 'Find possible matches')),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      var lng = 81.7795;
      var lat = 16.9846;
      final perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.always || perm == LocationPermission.whileInUse) {
        final pos = await Geolocator.getCurrentPosition();
        lng = pos.longitude;
        lat = pos.latitude;
      }
      final api = ref.read(apiClientProvider);
      final res = await api.post('/found-reports', {
        if (widget.scannedUid != null) 'scannedUid': widget.scannedUid,
        'ageBand': _ageBand,
        'gender': _gender,
        'clothing': _clothing.text.trim(),
        'languageSpoken': _language.text.trim(),
        'location': {'lng': lng, 'lat': lat},
      });
      if (!mounted) return;
      context.push('/volunteer/match', extra: res);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
