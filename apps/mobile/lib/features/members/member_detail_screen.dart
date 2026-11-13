import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';
import '../../theme/app_theme.dart';
import '../home/home_tab.dart';

class MemberDetailScreen extends ConsumerStatefulWidget {
  const MemberDetailScreen({super.key, required this.uid});
  final String uid;

  @override
  ConsumerState<MemberDetailScreen> createState() => _MemberDetailScreenState();
}

class _MemberDetailScreenState extends ConsumerState<MemberDetailScreen> {
  bool _loading = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final members = ref.watch(membersProvider);
    return Scaffold(
      appBar: AppBar(title: Text(widget.uid)),
      body: members.when(
        data: (list) {
          final m = list.cast<Map<String, dynamic>?>().firstWhere(
                (e) => e?['uid'] == widget.uid,
                orElse: () => null,
              );
          if (m == null) return const Center(child: Text('Member not found'));
          final missing = m['caseStatus'] == 'MISSING';
          return Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('${m['name']} (${m['uid']})', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                Card(
                  child: ListTile(
                    title: const Text('Photo + details'),
                    subtitle: Text('${m['ageBand'] ?? ''} · Tap report to alert police'),
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  height: 160,
                  decoration: BoxDecoration(color: const Color(0xFFE8EEF4), borderRadius: BorderRadius.circular(12)),
                  alignment: Alignment.center,
                  child: Text(missing ? 'Last seen pin active' : 'Last seen (auto from GPS)'),
                ),
                if (_error != null) Text(_error!, style: const TextStyle(color: AppColors.alert)),
                const Spacer(),
                FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: AppColors.alert),
                  onPressed: missing || _loading ? null : _confirmReport,
                  child: Text(_loading ? '…' : 'REPORT MISSING'),
                ),
                const SizedBox(height: 8),
                OutlinedButton(onPressed: () => context.push('/member/${widget.uid}/qr'), child: const Text('Show QR wristband')),
                const SizedBox(height: 8),
                const Text('Police and nearby volunteers are alerted instantly.', textAlign: TextAlign.center),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
      ),
    );
  }

  Future<void> _confirmReport() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Report this member as missing?'),
        content: const Text('Police and nearby volunteers will be alerted.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.alert),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Report missing'),
          ),
        ],
      ),
    );
    if (ok != true) return;

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
      final caseRes = await api.post('/cases/report-missing', {
        'memberUid': widget.uid,
        'lastSeen': {
          'lng': pos?.longitude ?? 81.7795,
          'lat': pos?.latitude ?? 16.9846,
        },
        'lastSeenLabel': 'Ghat 3 steps',
        'note': 'Reported from mobile app',
      });
      ref.invalidate(membersProvider);
      if (!mounted) return;
      context.push('/case/${caseRes['id']}');
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
