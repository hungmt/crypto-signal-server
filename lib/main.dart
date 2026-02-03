import 'dart:html' as html;
import 'package:flutter/material.dart';
import 'favorites.dart';
import 'api.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Dashboard(),
    );
  }
}

class Dashboard extends StatefulWidget {
  const Dashboard({super.key});

  @override
  State<Dashboard> createState() => _DashboardState();
}

class _DashboardState extends State<Dashboard> {
  List<String> favorites = [];
  List<dynamic> signals = [];
  List<String> allSymbols = [];

  String search = "";
  String interval = "15m";

  @override
  void initState() {
    super.initState();
    init();
  }

  final Map<String, String> refLinks = {
    "Binance": "https://accounts.binance.com/register?ref=83521708",
    "MEXC": "https://promote.mexc.com/a/5ivHrwsQ",
  };
  void openExchange(String url) {
    html.window.open(url, "_blank");
  }

  Future<void> init() async {
    favorites = Favorites.get();
    allSymbols = await fetchSymbols();
    await loadSignals();
  }

  Future<void> loadSignals() async {
    final favs = Favorites.get(); // LUÔN lấy mới từ storage
    final data = await fetchSignals(favs, interval);

    setState(() {
      favorites = favs;
      signals = data;
    });
  }

  void openBinance() {
    html.window.open(
      "https://accounts.binance.com/register?ref=83521708",
      "_blank",
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = search.isEmpty
        ? []
        : allSymbols
            .where((s) => s.contains(search.toUpperCase()))
            .take(20)
            .toList();

    return Scaffold(
      backgroundColor: Colors.black,
      body: ListView(
        padding: const EdgeInsets.all(30),
        children: [
          const Text(
            "Crypto Entry Signals",
            style: TextStyle(color: Colors.white, fontSize: 28),
          ),

          const SizedBox(height: 20),

          /// TIMEFRAME
          Row(
            children: [
              const Text("Timeframe:", style: TextStyle(color: Colors.white)),
              const SizedBox(width: 10),
              DropdownButton<String>(
                value: interval,
                dropdownColor: Colors.black,
                style: const TextStyle(color: Colors.white),
                items: ["15m", "1h", "2h", "4h", "1d"]
                    .map((e) => DropdownMenuItem(
                          value: e,
                          child: Text(e),
                        ))
                    .toList(),
                onChanged: (v) async {
                  interval = v!;
                  await loadSignals();
                },
              ),
            ],
          ),

          const SizedBox(height: 20),

          /// SEARCH
          TextField(
            style: const TextStyle(color: Colors.white),
            decoration: const InputDecoration(
              hintText: "Search coin (BTC, SUI...)",
              hintStyle: TextStyle(color: Colors.white54),
            ),
            onChanged: (v) => setState(() => search = v),
          ),

          /// SEARCH RESULT
          if (filtered.isNotEmpty)
            Container(
              margin: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: Colors.grey[900],
                borderRadius: BorderRadius.circular(8),
              ),
              child: ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filtered.length,
                itemBuilder: (context, index) {
                  final s = filtered[index];
                  return ListTile(
                    title: Text(s, style: const TextStyle(color: Colors.white)),
                    trailing: ElevatedButton(
                      onPressed: () async {
                        Favorites.add(s);
                        search = "";
                        await loadSignals();
                      },
                      child: const Text("Add"),
                    ),
                  );
                },
              ),
            ),

          const SizedBox(height: 30),

          const Text(
            "Favorites Signals",
            style: TextStyle(color: Colors.white, fontSize: 22),
          ),

          const SizedBox(height: 10),
          Text(
            "Favorites Signals (${favorites.length}/10)",
            style: const TextStyle(color: Colors.white, fontSize: 14),
          ),

          /// SIGNAL LIST
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: signals.length,
            itemBuilder: (context, index) {
              final s = signals[index];

              final color = s['signal'] == 'LONG'
                  ? Colors.green
                  : s['signal'] == 'SHORT'
                      ? Colors.red
                      : Colors.grey;

              return Card(
                color: Colors.grey[900],
                child: ListTile(
                  title: Text(
                    s['symbol'],
                    style: const TextStyle(color: Colors.white),
                  ),
                  subtitle: Text(
                    "${s['interval']} | RSI: ${s['rsi']} | ${s['signal']}",
                    style: TextStyle(color: color),
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Wrap(
                        spacing: 6,
                        children: refLinks.entries.map((e) {
                          return ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color.fromARGB(255, 2, 95, 18),
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 8),
                            ),
                            onPressed: () => openExchange(e.value),
                            child: Text(e.key,
                                style: const TextStyle(fontSize: 12, color: Colors.white)),
                          );
                        }).toList(),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete, color: Colors.red),
                        onPressed: () async {
                          Favorites.remove(s['symbol']);
                          await loadSignals();
                        },
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
