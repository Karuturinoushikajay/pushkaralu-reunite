import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../theme/app_theme.dart';
import 'police_cases_tab.dart';
import 'police_found_tab.dart';
import 'police_map_tab.dart';
import 'police_alerts_tab.dart';
import 'police_profile_tab.dart';

class PoliceShell extends ConsumerStatefulWidget {
  const PoliceShell({super.key});

  @override
  ConsumerState<PoliceShell> createState() => _PoliceShellState();
}

class _PoliceShellState extends ConsumerState<PoliceShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = const [
      PoliceCasesTab(),
      PoliceFoundTab(),
      PoliceMapTab(),
      PoliceAlertsTab(),
      PoliceProfileTab(),
    ];
    return Scaffold(
      body: pages[_index],
      floatingActionButton: _index == 0
          ? FloatingActionButton(
              backgroundColor: AppColors.amber,
              foregroundColor: AppColors.navy,
              onPressed: () => context.push('/police/register-case'),
              child: const Icon(Icons.add),
            )
          : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.folder_open), label: 'Cases'),
          NavigationDestination(icon: Icon(Icons.person_search), label: 'Found'),
          NavigationDestination(icon: Icon(Icons.map), label: 'Map'),
          NavigationDestination(icon: Icon(Icons.campaign), label: 'Alerts'),
          NavigationDestination(icon: Icon(Icons.badge), label: 'Profile'),
        ],
      ),
    );
  }
}
