import { DataSource } from 'typeorm';
import { Instrument } from '../entities/Instrument';
import { User } from '../entities/User';
import { Order } from '../entities/Order';
import { MarketData } from '../entities/MarketData';
import { PortfolioSnapshot } from '../entities/PortfolioSnapshot';

// Configuración de base de datos para la aplicación
// Usa DB_TEST_* cuando NODE_ENV=test, DB_* en otros casos
const isTestMode = process.env.NODE_ENV === 'test';
const host = isTestMode 
  ? (process.env.DB_TEST_HOST || 'localhost')
  : (process.env.DB_HOST || 'localhost');
const port = isTestMode
  ? parseInt(process.env.DB_TEST_PORT || '5433', 10)
  : parseInt(process.env.DB_PORT || '5432', 10);
const username = isTestMode
  ? (process.env.DB_TEST_USERNAME || 'postgres')
  : (process.env.DB_USERNAME || 'postgres');
const password = isTestMode
  ? (process.env.DB_TEST_PASSWORD || 'postgres')
  : (process.env.DB_PASSWORD || 'postgres');
const database = isTestMode
  ? (process.env.DB_TEST_NAME || 'cocos_test')
  : (process.env.DB_NAME || 'cocos');
const sslEnabled = isTestMode
  ? process.env.DB_TEST_SSL === 'true'
  : process.env.DB_SSL === 'true';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host,
  port,
  username,
  password,
  database,
  entities: [Instrument, User, Order, MarketData, PortfolioSnapshot],
  synchronize: false, // No usar en producción, ya tenemos el schema
  logging: process.env.NODE_ENV === 'development',
  ssl: sslEnabled ? {
    rejectUnauthorized: false, // Para servicios en la nube como Neon
  } : false,
});

// Función para verificar que las variables de entorno están cargadas (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  console.log('Database config:', {
    host: host,
    port: port,
    database: database,
    username: username,
    ssl: sslEnabled ? 'enabled' : 'disabled',
  });
}
