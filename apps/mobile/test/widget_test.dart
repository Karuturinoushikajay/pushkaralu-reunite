import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pushkaralu_reunite/main.dart';

void main() {
  testWidgets('app boots', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: PushkaraluApp()));
    await tester.pumpAndSettle();
    expect(find.textContaining('Pushkaralu'), findsWidgets);
  });
}
