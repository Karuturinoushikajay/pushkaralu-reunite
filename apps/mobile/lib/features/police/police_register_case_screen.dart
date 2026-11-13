import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';
import '../../theme/app_theme.dart';

/// Police phone: search registered pilgrim then register as missing / open family call.
class PoliceRegisterCaseScreen extends ConsumerStatefulWidget {
  const PoliceRegisterCaseScreen({super.key});

  @override
  ConsumerState<PoliceRegisterCaseScreen> createState() => _PoliceRegisterCaseScreenState();
}

class _PoliceRegisterCaseScreenState extends ConsumerState<PoliceRegisterCaseScreen> {
  final _name = TextEditingController();
  final _familyId = TextEditingController();
  bool _loading = false;
  String? _error;
  List<dynamic> _results = [];

  Future<void> _search() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final mode = _familyId.text.trim().isNotEmpty ? 'familyId' : 'name';
      final res = await api.post('/search/pilgrims', {
        'mode': mode,
        if (mode == 'name') 'name': _name.text.trim(),
        if (mode == 'familyId') 'familyId': _familyId.text.trim().toUpperCase(),
      });
      final map = Map<String, dynamic>.from(res as Map);
      setState(() => _results = (map['results'] as List?) ?? []);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Register case')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Text('Search the registered pilgrim'),
          const SizedBox(height: 12),
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Name')),
          const SizedBox(height: 12),
          TextField(controller: _familyId, decoration: const InputDecoration(labelText: 'Family ID (optional)', hintText: 'K7M2')),
          const SizedBox(height: 16),
          FilledButton(onPressed: _loading ? null : _search, child: Text(_loading ? '…' : 'Search')),
          if (_error != null) Text(_error!, style: const TextStyle(color: AppColors.alert)),
          const SizedBox(height: 16),
          for (final r in _results)
            Card(
              child: ListTile(
                title: Text('${r['name']} · ${r['uid']}'),
                subtitle: Text('Family ${r['familyCode']} · ${r['caseStatus'] ?? 'REGISTERED'}'),
                onTap: () => context.push('/volunteer/family-call', extra: r),
              ),
            ),
        ],
      ),
    );
  }
}
