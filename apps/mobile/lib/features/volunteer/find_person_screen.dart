import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';
import '../../theme/app_theme.dart';

class FindPersonScreen extends ConsumerStatefulWidget {
  const FindPersonScreen({super.key});

  @override
  ConsumerState<FindPersonScreen> createState() => _FindPersonScreenState();
}

class _FindPersonScreenState extends ConsumerState<FindPersonScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  final _name = TextEditingController();
  final _familyId = TextEditingController();
  final _aadhaar = TextEditingController();
  String _ageBand = 'CHILD_6_8';
  bool _loading = false;
  String? _error;
  bool _faceDisabled = false;
  List<dynamic> _results = [];

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 5, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    _name.dispose();
    _familyId.dispose();
    _aadhaar.dispose();
    super.dispose();
  }

  Future<void> _search(String mode) async {
    setState(() {
      _loading = true;
      _error = null;
      _faceDisabled = false;
    });
    try {
      final api = ref.read(apiClientProvider);
      final body = <String, dynamic>{'mode': mode};
      if (mode == 'name') {
        body['name'] = _name.text.trim();
        body['ageBand'] = _ageBand;
      } else if (mode == 'familyId') {
        body['familyId'] = _familyId.text.trim().toUpperCase();
      } else if (mode == 'aadhaar') {
        body['aadhaarNumber'] = _aadhaar.text.replaceAll(RegExp(r'\D'), '');
      } else if (mode == 'photo') {
        body['photoKey'] = 'photos/search-${DateTime.now().millisecondsSinceEpoch}.jpg';
      } else if (mode == 'qr') {
        if (!mounted) return;
        context.push('/volunteer/scan');
        return;
      }
      final res = Map<String, dynamic>.from(await api.post('/search/pilgrims', body) as Map);
      setState(() {
        _faceDisabled = res['faceMatchDisabled'] == true;
        _results = (res['results'] as List?) ?? [];
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Find person'),
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Name'),
            Tab(text: 'Family ID'),
            Tab(text: 'Aadhaar'),
            Tab(text: 'Photo'),
            Tab(text: 'Scan QR'),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: [
                _pane([
                  TextField(controller: _name, decoration: const InputDecoration(labelText: 'Name (as the person tells you)')),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _ageBand,
                    items: const [
                      DropdownMenuItem(value: 'CHILD_6_8', child: Text('6 to 8')),
                      DropdownMenuItem(value: 'CHILD_9_12', child: Text('9 to 12')),
                      DropdownMenuItem(value: 'SENIOR_60_PLUS', child: Text('60+')),
                      DropdownMenuItem(value: 'ADULT_18_59', child: Text('Adult')),
                    ],
                    onChanged: (v) => setState(() => _ageBand = v ?? _ageBand),
                    decoration: const InputDecoration(labelText: 'Approx. age band'),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(onPressed: _loading ? null : () => _search('name'), child: const Text('Search')),
                ]),
                _pane([
                  TextField(controller: _familyId, decoration: const InputDecoration(labelText: 'Family ID', hintText: 'K7M2')),
                  const SizedBox(height: 16),
                  FilledButton(onPressed: _loading ? null : () => _search('familyId'), child: const Text('Search')),
                ]),
                _pane([
                  TextField(
                    controller: _aadhaar,
                    maxLength: 12,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Aadhaar number'),
                  ),
                  FilledButton(onPressed: _loading ? null : () => _search('aadhaar'), child: const Text('Search')),
                ]),
                _pane([
                  const Text('Photo: take a picture and the app lists likely matches by face. A person confirms every match.'),
                  const SizedBox(height: 12),
                  FilledButton(onPressed: _loading ? null : () => _search('photo'), child: const Text('Take photo & search')),
                  if (_faceDisabled)
                    const Padding(
                      padding: EdgeInsets.only(top: 12),
                      child: Text(
                        'Face matching is switched off until legal approval. Use name, family ID, Aadhaar or QR.',
                        style: TextStyle(color: AppColors.alert),
                      ),
                    ),
                ]),
                _pane([
                  const Text('Scan the wristband QR. Payload is the member UID only.'),
                  const SizedBox(height: 16),
                  FilledButton(onPressed: () => context.push('/volunteer/scan'), child: const Text('Open scanner')),
                ]),
              ],
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Text(_error!, style: const TextStyle(color: AppColors.alert)),
            ),
          if (_results.isNotEmpty)
            Flexible(
              child: Container(
                color: const Color(0xFFF4F6F8),
                child: ListView(
                  padding: const EdgeInsets.all(12),
                  children: [
                    Text('Results (${_results.length})', style: const TextStyle(fontWeight: FontWeight.w700)),
                    const Text('Matches are suggestions. Compare before you choose.'),
                    for (final r in _results)
                      Card(
                        child: ListTile(
                          title: Text('${r['name']} · ${r['uid']}'),
                          subtitle: Text(
                            [
                              if (r['faceMatchScore'] != null) 'Face match ${r['faceMatchScore']}%',
                              'Family ${r['familyCode']}',
                              if (r['caseStatus'] != null) r['caseStatus'],
                            ].join(' | '),
                          ),
                          trailing: r['caseStatus'] == 'MISSING'
                              ? const Chip(label: Text('MISSING'), backgroundColor: Color(0xFFFDECEB))
                              : null,
                          onTap: () => context.push('/volunteer/family-call', extra: r),
                        ),
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _pane(List<Widget> children) {
    return ListView(padding: const EdgeInsets.all(24), children: children);
  }
}
