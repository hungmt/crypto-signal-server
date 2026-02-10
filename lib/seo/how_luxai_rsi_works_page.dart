import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class HowLuxAiRsiWorksPage extends StatelessWidget {
  const HowLuxAiRsiWorksPage({super.key});

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
                  'How LuxAI + RSI Trading Strategy Works in Crypto',
                  style: TextStyle(fontSize: 34, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 20),

                const Text(
                  'LuxAI and RSI are two of the most powerful indicators used by professional crypto traders. '
                  'When combined correctly, they create a high-probability trading system that filters out false signals '
                  'and captures strong market moves.',
                  style: TextStyle(fontSize: 18, height: 1.6),
                ),

                const SizedBox(height: 30),

                const Text(
                  'What is LuxAI?',
                  style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                const Text(
                  'LuxAI is a trend detection system. It tells you whether the market is truly bullish, bearish, '
                  'or moving sideways. Most traders lose money because they trade against the trend. '
                  'LuxAI prevents that mistake by clearly identifying the real direction of the market.',
                  style: TextStyle(fontSize: 18, height: 1.6),
                ),

                const SizedBox(height: 30),

                const Text(
                  'What is RSI?',
                  style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                const Text(
                  'RSI (Relative Strength Index) measures momentum. It shows when a coin is overbought or oversold. '
                  'However, RSI alone creates many false signals because a coin can stay overbought or oversold for a long time during strong trends.',
                  style: TextStyle(fontSize: 18, height: 1.6),
                ),

                const SizedBox(height: 30),

                const Text(
                  'Why Combining LuxAI + RSI Works',
                  style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                const Text(
                  'The secret is filtering RSI signals using LuxAI trend direction:\n\n'
                  '• Only take RSI oversold signals when LuxAI shows bullish trend\n'
                  '• Only take RSI overbought signals when LuxAI shows bearish trend\n'
                  '• Avoid trading when LuxAI shows sideways movement\n\n'
                  'This removes most fake entries and dramatically increases win rate.',
                  style: TextStyle(fontSize: 18, height: 1.6),
                ),

                const SizedBox(height: 30),

                const Text(
                  'Trading Rules Used in This Tool',
                  style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                const Text(
                  '• LONG when RSI is very low and LuxAI turns bullish\n'
                  '• SHORT when RSI is very high and LuxAI turns bearish\n'
                  '• WAIT when conditions are not aligned\n'
                  '• Automatic TP and SL calculation for each signal',
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
                      'Open Live LuxAI + RSI Signal Tool',
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
