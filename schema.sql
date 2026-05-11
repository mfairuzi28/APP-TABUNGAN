CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transaksi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  jumlah INTEGER,
  keterangan TEXT,
  tipe TEXT,
  created_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);