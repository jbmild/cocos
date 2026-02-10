-- Tabla para almacenar snapshots diarios del portfolio
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id SERIAL PRIMARY KEY,
  userId INT NOT NULL,
  snapshot_date DATE NOT NULL,
  available_cash NUMERIC(18, 2) NOT NULL,
  positions_map JSONB NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id),
  UNIQUE (userId, snapshot_date)
);

-- Índice para búsquedas rápidas por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date ON portfolio_snapshots(userId, snapshot_date DESC);
