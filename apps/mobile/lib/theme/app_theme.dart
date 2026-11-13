import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Civic palette from the product brief — no purple, glass, or neon.
class AppColors {
  static const navy = Color(0xFF12263F);
  static const amber = Color(0xFFE8A33D);
  static const alert = Color(0xFFB42318);
  static const success = Color(0xFF1B7F4B);
  static const background = Color(0xFFF4F6F8);
  static const muted = Color(0xFF5B6B7C);
}

class AppTheme {
  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.navy,
        primary: AppColors.navy,
        secondary: AppColors.amber,
        error: AppColors.alert,
        surface: Colors.white,
        brightness: Brightness.light,
      ),
      scaffoldBackgroundColor: AppColors.background,
    );

    final textTheme = GoogleFonts.notoSansTextTheme(base.textTheme).apply(
      bodyColor: AppColors.navy,
      displayColor: AppColors.navy,
    );

    return base.copyWith(
      textTheme: textTheme,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.navy,
        elevation: 0,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(0xFFD7DEE7)),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          backgroundColor: AppColors.navy,
          foregroundColor: Colors.white,
          textStyle: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          side: const BorderSide(color: AppColors.navy),
          foregroundColor: AppColors.navy,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        indicatorColor: AppColors.amber.withValues(alpha: 0.35),
        labelTextStyle: WidgetStatePropertyAll(
          textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
