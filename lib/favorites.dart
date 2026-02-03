import 'dart:html';

class Favorites {
  static const key = "favorites_symbols";

 static List<String> get() {
    final raw = window.localStorage[key];

    // Nếu chưa có favorites -> set mặc định
    if (raw == null || raw.isEmpty) {
      final defaults = ["BTCUSDT", "ETHUSDT"];
      window.localStorage[key] = defaults.join(",");
      return defaults;
    }

    return raw.split(",");
  }

  static void add(String symbol) {
    final list = get();
    if (!list.contains(symbol)) {
      list.add(symbol);
      window.localStorage[key] = list.join(",");
    }
  }

  static void remove(String symbol) {
    final list = get();
    list.remove(symbol);
    window.localStorage[key] = list.join(",");
  }
}
