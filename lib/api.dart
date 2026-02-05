import 'dart:convert';
import 'package:http/http.dart' as http;

const String baseUrl = "https://crypto-signal-server.onrender.com";
// local test: http://localhost:3000
//const String baseUrl = "http://localhost:3000"; 
/// ===== LẤY TOÀN BỘ SYMBOL TỪ BINANCE (qua server)
Future<List<String>> fetchSymbols(String text) async {
  final url = Uri.parse("$baseUrl/symbols?search=$text");

  final res = await http.get(url);

  if (res.statusCode == 200) {
    final List data = jsonDecode(res.body);
    return data.map((e) => e.toString()).toList();
  }

  return [];
}


/// ===== LẤY FAVORITES TỪ SERVER
Future<List<String>> fetchFavorites() async {
  final res = await http.get(Uri.parse("$baseUrl/favorites"));

  if (res.statusCode == 200) {
    final List data = jsonDecode(res.body);
    return data.map((e) => e.toString()).toList();
  }
  return [];
}

/// ===== ADD FAVORITE
Future<void> addFavorite(String symbol) async {
  await http.post(
    Uri.parse("$baseUrl/favorites"),
    headers: {"Content-Type": "application/json"},
    body: jsonEncode({"symbol": symbol}),
  );
}

/// ===== REMOVE FAVORITE
Future<void> removeFavorite(String symbol) async {
  await http.delete(Uri.parse("$baseUrl/favorites/$symbol"));
}

/// ===== LẤY SIGNAL THEO TIMEFRAME
Future<List<dynamic>> fetchSignals(String interval) async {
  final res = await http.get(
    Uri.parse("$baseUrl/signals?interval=$interval"),
  );

  if (res.statusCode == 200) {
    final Map<String, dynamic> data = jsonDecode(res.body);

    /// server trả về dạng Map {BTCUSDT: {...}}
    return data.values.toList();
  }

  return [];
}
