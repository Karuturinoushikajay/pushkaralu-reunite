import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/session.dart';
import '../../theme/app_theme.dart';
import '../home/home_tab.dart';

class AddMemberScreen extends ConsumerStatefulWidget {
  const AddMemberScreen({super.key});

  @override
  ConsumerState<AddMemberScreen> createState() => _AddMemberScreenState();
}

class _AddMemberScreenState extends ConsumerState<AddMemberScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
  final _aadhaar = TextEditingController();
  final _emergency = TextEditingController();
  String _ageBand = 'CHILD_6_8';
  bool _minorConsent = true;
  bool _photoTaken = false;
  bool _loading = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add member')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Name *')),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _ageBand,
            items: const [
              DropdownMenuItem(value: 'CHILD_3_5', child: Text('Child 3–5')),
              DropdownMenuItem(value: 'CHILD_6_8', child: Text('Child 6–8')),
              DropdownMenuItem(value: 'CHILD_9_12', child: Text('Child 9–12')),
              DropdownMenuItem(value: 'TEEN_13_17', child: Text('Teen 13–17')),
              DropdownMenuItem(value: 'ADULT_18_59', child: Text('Adult')),
              DropdownMenuItem(value: 'SENIOR_60_PLUS', child: Text('Senior 60+')),
            ],
            onChanged: (v) => setState(() => _ageBand = v ?? _ageBand),
            decoration: const InputDecoration(labelText: 'Age band *'),
          ),
          const SizedBox(height: 12),
          TextField(controller: _phone, decoration: const InputDecoration(labelText: 'Own phone (if any)')),
          const SizedBox(height: 12),
          TextField(controller: _address, decoration: const InputDecoration(labelText: 'Address *')),
          const SizedBox(height: 12),
          TextField(
            controller: _aadhaar,
            maxLength: 12,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Aadhaar number (optional for children)',
              hintText: 'XXXX XXXX XXXX',
            ),
          ),
          TextField(controller: _emergency, decoration: const InputDecoration(labelText: 'Emergency phone *')),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => setState(() => _photoTaken = true),
            icon: Icon(_photoTaken ? Icons.check_circle : Icons.camera_alt),
            label: Text(_photoTaken ? 'Live photo captured' : 'Live photo * — tap to open camera'),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFE8F6EE), borderRadius: BorderRadius.circular(8)),
            child: const Text('Add as many members as needed. Next ID stays in the same family code (e.g. K7M2-02).'),
          ),
          CheckboxListTile(
            value: _minorConsent,
            onChanged: (v) => setState(() => _minorConsent = v ?? false),
            title: const Text('Guardian consent for this minor (if under 18)'),
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: EdgeInsets.zero,
          ),
          if (_error != null) Text(_error!, style: const TextStyle(color: AppColors.alert)),
          FilledButton(onPressed: _loading ? null : _save, child: Text(_loading ? '…' : 'Add member')),
        ],
      ),
    );
  }

  Future<void> _save() async {
    final aadhaar = _aadhaar.text.replaceAll(RegExp(r'\D'), '');
    if (aadhaar.isNotEmpty && aadhaar.length != 12) {
      setState(() => _error = 'Aadhaar must be 12 digits or empty');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/members', {
        'name': _name.text.trim(),
        'ageBand': _ageBand,
        if (_address.text.trim().isNotEmpty) 'address': _address.text.trim(),
        if (_phone.text.trim().isNotEmpty) 'ownPhone': _phone.text.trim(),
        if (_emergency.text.trim().isNotEmpty) 'emergencyPhone': _emergency.text.trim(),
        if (aadhaar.length == 12) 'aadhaarNumber': aadhaar,
        'minorGuardianConsent': _minorConsent,
        'photoKey': 'photos/member-${DateTime.now().millisecondsSinceEpoch}.jpg',
      });
      ref.invalidate(membersProvider);
      if (!mounted) return;
      context.pop();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
