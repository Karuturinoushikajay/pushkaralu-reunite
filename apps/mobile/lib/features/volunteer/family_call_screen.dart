import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';
import '../../theme/app_theme.dart';

class FamilyCallScreen extends ConsumerStatefulWidget {
  const FamilyCallScreen({super.key, required this.hit});
  final Map<String, dynamic> hit;

  @override
  ConsumerState<FamilyCallScreen> createState() => _FamilyCallScreenState();
}

class _FamilyCallScreenState extends ConsumerState<FamilyCallScreen> {
  List<dynamic> _family = [];
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadFamily();
  }

  Future<void> _loadFamily() async {
    try {
      final api = ref.read(apiClientProvider);
      final uid = widget.hit['uid'] as String;
      final res = await api.get('/search/pilgrims/$uid/family') as Map<String, dynamic>;
      if (mounted) setState(() => _family = (res['family'] as List?) ?? []);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _register(String outcome) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final permission = await Geolocator.requestPermission();
      Position? pos;
      if (permission == LocationPermission.always || permission == LocationPermission.whileInUse) {
        pos = await Geolocator.getCurrentPosition();
      }
      final api = ref.read(apiClientProvider);
      final res = await api.post('/cases/register-from-find', {
        'memberUid': widget.hit['uid'],
        'callOutcome': outcome,
        'location': {
          'lng': pos?.longitude ?? 81.7795,
          'lat': pos?.latitude ?? 16.9846,
        },
        'locationLabel': 'Ghat 3 steps',
        'clothing': 'As observed by volunteer',
        'boothCode': 'BOOTH-07',
      });
      if (!mounted) return;
      context.go('/volunteer/case-registered', extra: Map<String, dynamic>.from(res as Map));
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hit = widget.hit;
    return Scaffold(
      appBar: AppBar(title: Text('${hit['name']} (${hit['uid']})')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          if (hit['caseStatus'] != null)
            Chip(
              label: Text('${hit['caseStatus']}'),
              backgroundColor: const Color(0xFFFDECEB),
            ),
          const SizedBox(height: 8),
          const Text('Pick the call outcome', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          const Text('Numbers are hidden. Call is logged. The case is registered either way.'),
          const SizedBox(height: 16),
          for (final f in _family)
            Card(
              child: ListTile(
                title: Text('${f['relation']}  ${f['name']}'),
                subtitle: Text(f['hasPhone'] == true ? 'Number hidden. Call is logged.' : 'No phone on file'),
                trailing: f['hasPhone'] == true
                    ? TextButton(onPressed: () {}, child: const Text('Call'))
                    : null,
              ),
            ),
          if (_error != null) Text(_error!, style: const TextStyle(color: AppColors.alert)),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _loading ? null : () => _register('RESPONDED'),
            child: const Text('Family responded: register case'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: _loading ? null : () => _register('NO_RESPONSE'),
            child: const Text('No response: register case'),
          ),
        ],
      ),
    );
  }
}
