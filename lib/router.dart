import 'package:crypto_signal_web/dashboard_page.dart';
import 'package:crypto_signal_web/seo/free_crypto_signal_tool.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'seo/luxai_rsi_signal_page.dart';
import 'seo/how_luxai_rsi_works_page.dart';

final GoRouter router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const Scaffold(
        body: SafeArea(child: DashboardPage()),
      ),
    ),
    GoRoute(
      path: '/luxai-rsi-signal',
      builder: (context, state) => const LuxAiRsiSignalPage(),
    ),
    GoRoute(
      path: '/how-luxai-rsi-works',
      builder: (context, state) => const HowLuxAiRsiWorksPage(),
    ),
    GoRoute(
      path: '/free-crypto-signal-tool',
      builder: (context, state) => const FreeCryptoSignalToolPage(),
    ),
  ],
);

