import 'dart:convert';
import 'package:http/http.dart' as http;

const baseUrl = "http://localhost:3000";

Future<List<String>> fetchSymbols() async {
  final res = await http.get(Uri.parse("$baseUrl/symbols"));
  final data = jsonDecode(res.body);
  return List<String>.from(data);
}

Future<List<dynamic>> fetchSignals(
    List<String> symbols, String interval) async {
  List results = [];

  for (var s in symbols) {
    final res = await http.get(Uri.parse(
        "$baseUrl/signal?symbol=$s&interval=$interval"));

    if (res.statusCode == 200) {
      results.add(jsonDecode(res.body));
    }
  }

  return results;
}
