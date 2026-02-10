import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class LuxAiRsiSignalPage extends StatelessWidget {
  const LuxAiRsiSignalPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 900),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Free LuxAI + RSI Trading Signal Tool for Any Crypto Pair',
                  style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 20),
                const Text(
                  'This tool combines LuxAI trend detection with RSI momentum '
                  'to generate high probability crypto trading signals.',
                  style: TextStyle(fontSize: 18),
                ),

                const SizedBox(height: 30),

                /// ✅ NÚT VỀ TOOL
                ElevatedButton(
                  onPressed: () {
                    context.go('/');
                  },
                  child: const Text("Open Live Signal Tool"),
                ),

                const SizedBox(height: 30),
                const Text(
                  'Why LuxAI + RSI Works',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                const Text(
                  'RSI alone creates many false signals. LuxAI filters trend direction. '
                  'Combining both creates a powerful trading system for crypto traders.',
                  style: TextStyle(fontSize: 18),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
