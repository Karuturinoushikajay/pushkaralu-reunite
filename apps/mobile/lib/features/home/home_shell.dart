import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme/app_theme.dart';
import 'home_tab.dart';
import '../members/my_list_tab.dart';
import '../profile/profile_tab.dart';
import '../news/news_tab.dart';
import '../booths/booths_tab.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      const HomeTab(),
      const NewsTab(),
      const MyListTab(),
      const ProfileTab(),
      const BoothsTab(),
    ];

    return Scaffold(
      body: pages[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_rounded), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.campaign_rounded), label: 'News'),
          NavigationDestination(icon: Icon(Icons.group_rounded), label: 'My List'),
          NavigationDestination(icon: Icon(Icons.person_rounded), label: 'Profile'),
          NavigationDestination(icon: Icon(Icons.storefront_rounded), label: 'Booths'),
        ],
        indicatorColor: AppColors.amber.withValues(alpha: 0.35),
      ),
      floatingActionButton: _index == 0
          ? null
          : null,
    );
  }
}

/// Helper used by tabs that need navigation outside the shell.
void goAddMember(BuildContext context) => context.push('/add-member');
