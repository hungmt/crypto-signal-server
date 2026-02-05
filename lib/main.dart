import 'dart:async';
import 'dart:html' as html;
import 'package:flutter/material.dart';
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
  List<dynamic> signals = [];
  List<String> favorites = [];
  List<String> searchResult = [];

  String interval = "15m";
  String search = "";

  bool isLoading = true;
  bool _isFetching = false;

  Timer? timer;

  @override
  void initState() {
    super.initState();
    initData();
    timer = Timer.periodic(const Duration(seconds: 20), (_) => loadSignals());
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  /// INIT: chỉ load favorites + signals
  Future<void> initData() async {
    favorites = await fetchFavorites();
    await loadSignals();
  }

  /// LOOP: chỉ load signals
  Future<void> loadSignals() async {
    if (_isFetching) return;
    _isFetching = true;

    setState(() => isLoading = true);

    final data = await fetchSignals(interval);

    if (!mounted) return;

    setState(() {
      signals = data;
      isLoading = false;
    });

    _isFetching = false;
  }

  /// SEARCH SYMBOLS (chỉ dùng cho add)
Future<void> onSearch(String text) async {
  search = text;

  final result = await fetchSymbols(text);

  setState(() {
    searchResult = result;
  });
}

  Future<void> onAdd(String symbol) async {
    await addFavorite(symbol);
    search = "";
    searchResult = [];
    favorites = await fetchFavorites();
    await loadSignals();
  }

  Future<void> onRemove(String symbol) async {
    await removeFavorite(symbol);
    favorites = await fetchFavorites();
    await loadSignals();
  }

  String binanceTradeLink(String symbol) =>
      "https://www.binance.com/en/futures/$symbol?ref=83521708";

  String mexcTradeLink(String symbol) {
    final s = symbol.replaceAll("USDT", "_USDT");
    return "https://futures.mexc.com/exchange/$s?inviteCode=5ivHrwsQ";
  }
String fmt(dynamic v) {
  if (v == null) return "-";
  final n = (v as num).toDouble();
  return n.toStringAsFixed(4);
}
  @override
  Widget build(BuildContext context) {
   
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const Text(
                "Crypto Entry Signals",
                style: TextStyle(color: Colors.white, fontSize: 28),
              ),

              const SizedBox(height: 20),

              /// TIMEFRAME
              Row(
                children: [
                  const Text("Timeframe:",
                      style: TextStyle(color: Colors.white)),
                  const SizedBox(width: 10),
                  DropdownButton<String>(
                    value: interval,
                    dropdownColor: Colors.black,
                    style: const TextStyle(color: Colors.white),
                    items: ["15m", "1h", "2h", "4h", "1d"]
                        .map((e) => DropdownMenuItem(value: e, child: Text(e)))
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
                onChanged: onSearch,
              ),

              /// SEARCH RESULT
              if (searchResult.isNotEmpty)
                Container(
                  margin: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.grey[900],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: searchResult.length,
                    itemBuilder: (context, index) {
                      final s = searchResult[index];
                      return ListTile(
                        title: Text(s,
                            style: const TextStyle(color: Colors.white)),
                        trailing: ElevatedButton(
                          onPressed: () => onAdd(s),
                          child: const Text("Add"),
                        ),
                      );
                    },
                  ),
                ),

              const SizedBox(height: 20),

              Text(
                "Favorites (${favorites.length})",
                style: const TextStyle(color: Colors.white70),
              ),

              const SizedBox(height: 10),

              /// SIGNAL LIST
              ...signals.map((s) {
                final color = s['signal'] == 'LONG'
                    ? Colors.green
                    : s['signal'] == 'SHORT'
                        ? Colors.red
                        : Colors.grey;

                return Card(
                  color: Colors.grey[900],
                  margin: const EdgeInsets.symmetric(vertical: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        /// HEADER
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              s['symbol'],
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete,
                                  color: Colors.redAccent),
                              onPressed: () => onRemove(s['symbol']),
                            )
                          ],
                        ),

                        Text(
                          "${s['interval']} | RSI ${s['rsi']} | ${s['signal']}",
                          style: TextStyle(color: color),
                        ),

                        const SizedBox(height: 6),

                        Text(
                         "Price: ${fmt(s['price'])}",
                          style: const TextStyle(color: Colors.white70),
                        ),

                        if (s['signal'] != 'WAIT')
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Wrap(
                              spacing: 12,
                              children: [
                           Text("Entry: ${fmt(s['entry'])}",
                                    style: const TextStyle(
                                        color: Colors.yellow,
                                        fontWeight: FontWeight.bold)),
                           Text("TP: ${fmt(s['tp'])}",
                                    style: const TextStyle(
                                        color: Colors.green,
                                        fontWeight: FontWeight.bold)),
                             Text("SL: ${fmt(s['sl'])}",
                                    style: const TextStyle(
                                        color: Colors.red,
                                        fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),

                        const SizedBox(height: 10),

                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () => html.window.open(
                                    binanceTradeLink(s['symbol']), "_blank"),
                                child: const Text("Binance"),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () => html.window.open(
                                    mexcTradeLink(s['symbol']), "_blank"),
                                child: const Text("MEXC"),
                              ),
                            ),
                          ],
                        )
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),

          if (isLoading)
            Container(
              color: Colors.black.withOpacity(0.85),
              child: const Center(
                child: CircularProgressIndicator(color: Colors.green),
              ),
            ),
        ],
      ),
    );
  }
}
