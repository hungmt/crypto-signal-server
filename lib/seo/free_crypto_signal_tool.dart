import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class FreeCryptoSignalToolPage extends StatelessWidget {
  const FreeCryptoSignalToolPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 900),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Free Crypto Trading Signal Tool (LuxAI + RSI)',
                  style: TextStyle(fontSize: 34, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 20),

                const Text(
                  'Most crypto signal tools require paid subscriptions or complicated TradingView setup. '
                  'Our LuxAI + RSI signal tool works instantly, completely free, for any crypto pair on Binance or MEXC.',
                  style: TextStyle(fontSize: 18, height: 1.6),
                ),

                const SizedBox(height: 30),

                const Text(
                  'Why This Tool Is Different',
                  style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),

                const Text(
                  '• No TradingView indicators to configure\n'
                  '• No paid subscription\n'
                  '• Works instantly for any crypto pair\n'
                  '• Uses LuxAI trend detection + RSI momentum\n'
                  '• Automatic Entry, TP and SL calculation\n'
                  '• Designed for real crypto traders, not beginners\n',
                  style: TextStyle(fontSize: 18, height: 1.6),
                ),

                const SizedBox(height: 30),

                const Text(
                  'How It Works',
                  style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),

                const Text(
                  'The system scans the market continuously and waits for the perfect alignment:\n\n'
                  '• LuxAI confirms market trend\n'
                  '• RSI confirms momentum exhaustion\n'
                  '• Only then a signal is generated\n\n'
                  'This removes most fake signals that traders usually encounter.',
                  style: TextStyle(fontSize: 18, height: 1.6),
                ),

                const SizedBox(height: 40),

                Center(
                  child: ElevatedButton(
                    onPressed: () => context.go('/'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 40, vertical: 18),
                    ),
                    child: const Text(
                      'Open Free Live Signal Tool',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),

                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
