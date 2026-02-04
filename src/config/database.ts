import { DataSource } from 'typeorm';
import { Instrument } from '../entities/Instrument';

// Leer configuración SSL desde variables de entorno
const sslEnabled = process.env.DB_SSL === 'true';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'cocos',
  entities: [Instrument],
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
