import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

// Establecer NODE_ENV=test para que AppDataSource use las variables DB_TEST_*
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

import express from 'express';
import cors from 'cors';
import { AppDataSource } from '../../config/database';
import instrumentRoutes from '../../routes/instrumentRoutes';
import portfolioRoutes from '../../routes/portfolioRoutes';
import orderRoutes from '../../routes/orderRoutes';
import { User } from '../../entities/User';
import { Instrument } from '../../entities/Instrument';
import { MarketData } from '../../entities/MarketData';
import { Order } from '../../entities/Order';
import { InstrumentType } from '../../enums/InstrumentType';


let isDatabaseInitialized = false;

/**
 * Crea la aplicación Express para tests sin iniciar el servidor
 */
export function createTestApp(): express.Application {
  const app = express();

  // Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
  });

  // API Routes
  app.use('/instruments', instrumentRoutes);
  app.use('/portfolio', portfolioRoutes);
  app.use('/orders', orderRoutes);

  return app;
}

export async function initializeTestDatabase(): Promise<void> {
  if (isDatabaseInitialized && AppDataSource.isInitialized) {
    return;
  }

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  isDatabaseInitialized = true;
}

export async function cleanTestDatabase(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    return;
  }

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // Desactivar foreign key checks temporalmente
    await queryRunner.query('SET session_replication_role = replica;');
    
    // Limpiar tablas en orden correcto (respetando foreign keys)
    await queryRunner.query('TRUNCATE TABLE orders CASCADE;');
    await queryRunner.query('TRUNCATE TABLE marketdata CASCADE;');
    await queryRunner.query('TRUNCATE TABLE instruments CASCADE;');
    await queryRunner.query('TRUNCATE TABLE users CASCADE;');
    
    // Reactivar foreign key checks
    await queryRunner.query('SET session_replication_role = DEFAULT;');
  } finally {
    await queryRunner.release();
  }
}

/**
 * Cierra la conexión a la base de datos de test
 */
export async function closeTestDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    isDatabaseInitialized = false;
  }
}

/**
 * Crea un usuario de test
 */
export async function createTestUser(
  email: string = 'test@test.com',
  accountNumber: string = 'TEST001'
): Promise<User> {
  if (!AppDataSource.isInitialized) {
    throw new Error('Test database not initialized. Call initializeTestDatabase() first.');
  }
  const userRepository = AppDataSource.getRepository(User);
  const user = userRepository.create({
    email,
    accountNumber,
  });
  return await userRepository.save(user);
}

/**
 * Crea un instrumento de test
 */
export async function createTestInstrument(
  ticker: string,
  name: string,
  type: InstrumentType = InstrumentType.ACCIONES
): Promise<Instrument> {
  if (!AppDataSource.isInitialized) {
    throw new Error('Test database not initialized. Call initializeTestDatabase() first.');
  }
  const instrumentRepository = AppDataSource.getRepository(Instrument);
  const instrument = instrumentRepository.create({
    ticker,
    name,
    type,
  });
  return await instrumentRepository.save(instrument);
}

/**
 * Crea market data de test
 */
export async function createTestMarketData(
  instrumentId: number,
  close: number,
  previousClose: number,
  date: Date = new Date()
): Promise<MarketData> {
  if (!AppDataSource.isInitialized) {
    throw new Error('Test database not initialized. Call initializeTestDatabase() first.');
  }
  const marketDataRepository = AppDataSource.getRepository(MarketData);
  const marketData = marketDataRepository.create({
    instrumentId,
    close,
    previousClose,
    high: close * 1.1,
    low: close * 0.9,
    open: close * 0.95,
    date,
  });
  return await marketDataRepository.save(marketData);
}

/**
 * Crea una orden de test
 */
export async function createTestOrder(
  userId: number,
  instrumentId: number | null,
  side: string,
  type: string,
  size: number,
  price: number,
  status: string
): Promise<Order> {
  if (!AppDataSource.isInitialized) {
    throw new Error('Test database not initialized. Call initializeTestDatabase() first.');
  }
  const orderRepository = AppDataSource.getRepository(Order);
  const order = new Order();
  order.userId = userId;
  if (instrumentId !== null) {
    order.instrumentId = instrumentId;
  }
  order.side = side as any;
  order.type = type as any;
  order.size = size;
  order.price = price;
  order.status = status as any;
  order.datetime = new Date();
  return await orderRepository.save(order);
}

/**
 * Obtiene el instrumento ARS (cash) de la base de datos de test
 */
export async function getARSInstrument(): Promise<Instrument | null> {
  if (!AppDataSource.isInitialized) {
    throw new Error('Test database not initialized. Call initializeTestDatabase() first.');
  }
  const instrumentRepository = AppDataSource.getRepository(Instrument);
  return await instrumentRepository.findOne({
    where: { type: InstrumentType.MONEDA, ticker: 'ARS' },
  });
}

/**
 * Crea o obtiene el instrumento ARS (cash) en la base de datos de test
 */
export async function getOrCreateARSInstrument(): Promise<Instrument> {
  let arsInstrument = await getARSInstrument();
  
  if (!arsInstrument) {
    arsInstrument = await createTestInstrument('ARS', 'Peso Argentino', InstrumentType.MONEDA);
  }
  
  return arsInstrument;
}
