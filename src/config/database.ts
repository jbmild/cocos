import { DataSource } from 'typeorm';
import { Instrument } from '../entities/Instrument';
import { User } from '../entities/User';
import { Order } from '../entities/Order';
import { MarketData } from '../entities/MarketData';

// Determinar si estamos en modo test (cuando hay variables DB_TEST_* o NODE_ENV=test)
// Nota: Las variables de entorno deben estar cargadas antes de importar este módulo
const isTestMode = !!process.env.DB_TEST_HOST || process.env.NODE_ENV === 'test';

// Leer configuración desde variables de entorno (test o desarrollo)
const host = isTestMode ? (process.env.DB_TEST_HOST || 'localhost') : (process.env.DB_HOST || 'localhost');
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
  entities: [Instrument, User, Order, MarketData],
  synchronize: false, // No usar en producción, ya tenemos el schema
  logging: process.env.NODE_ENV === 'development',
  ssl: sslEnabled ? {
    rejectUnauthorized: false, // Para servicios en la nube como Neon
  } : false,
});

// Función para verificar que las variables de entorno están cargadas (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  console.log('Database config:', {
    host: process.env.DB_HOST || 'localhost (default)',
    port: process.env.DB_PORT || '5432 (default)',
    database: process.env.DB_NAME || 'cocos (default)',
    username: process.env.DB_USERNAME || 'postgres (default)',
    ssl: sslEnabled ? 'enabled' : 'disabled',
  });
}
