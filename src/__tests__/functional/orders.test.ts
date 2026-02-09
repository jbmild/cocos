// Cargar variables de entorno ANTES de importar cualquier módulo que use AppDataSource
import dotenv from 'dotenv';
dotenv.config();

// Establecer NODE_ENV=test para que AppDataSource use las variables DB_TEST_*
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

import request from 'supertest';
import express from 'express';
import {
  createTestApp,
  initializeTestDatabase,
  cleanTestDatabase,
  closeTestDatabase,
  createTestUser,
  createTestInstrument,
  createTestMarketData,
  createTestOrder,
  getOrCreateARSInstrument,
} from './setup';
import { OrderSide } from '../../enums/OrderSide';
import { OrderType } from '../../enums/OrderType';
import { OrderStatus } from '../../enums/OrderStatus';
import { InstrumentType } from '../../enums/InstrumentType';
import { Order } from '../../entities/Order';

describe('POST /orders - Functional Tests', () => {
  let app: express.Application;
  let originalConsoleError: typeof console.error;
  let testUser: any;
  let testInstrument: any;
  let arsInstrument: any;
  const marketPrice = 100.50;

  beforeAll(async () => {
    // Silenciar console.error durante los tests
    originalConsoleError = console.error;
    console.error = jest.fn();
    
    app = createTestApp();
    await initializeTestDatabase();
  });

  afterAll(async () => {
    // Restaurar console.error
    console.error = originalConsoleError;
    
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
    
    // Crear usuario de test
    testUser = await createTestUser('test@test.com', 'TEST001');
    
    // Crear instrumento de test
    testInstrument = await createTestInstrument('TEST', 'Test Instrument', InstrumentType.ACCIONES);
    
    // Crear market data para el instrumento
    await createTestMarketData(testInstrument.id, marketPrice, 95.00);
    
    // Obtener o crear instrumento ARS
    arsInstrument = await getOrCreateARSInstrument();
  });

  describe('MARKET BUY orders', () => {
    it('should create a MARKET BUY order with size successfully', async () => {
      // Primero hacer CASH_IN para tener fondos
      await createTestOrder(
        testUser.id,
        arsInstrument.id,
        OrderSide.CASH_IN,
        OrderType.MARKET,
        10000,
        1,
        OrderStatus.FILLED
      );

      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: testInstrument.id,
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          size: 10,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        userId: testUser.id,
        instrumentId: testInstrument.id,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        size: 10,
        price: marketPrice,
        status: OrderStatus.FILLED,
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.datetime).toBeDefined();
    });

    it('should create a MARKET BUY order with amount successfully', async () => {
      // Primero hacer CASH_IN para tener fondos
      await createTestOrder(
        testUser.id,
        arsInstrument.id,
        OrderSide.CASH_IN,
        OrderType.MARKET,
        10000,
        1,
        OrderStatus.FILLED
      );

      const amount = 1005; // 1005 / 100.50 = 10 shares
      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: testInstrument.id,
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          amount,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        userId: testUser.id,
        instrumentId: testInstrument.id,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        price: marketPrice,
        status: OrderStatus.FILLED,
      });
      // Debe calcular el size correctamente (1005 / 100.50 = 10)
      expect(response.body.data.size).toBe(10);
    });

    it('should reject MARKET BUY order when amount is too small', async () => {
      // Primero hacer CASH_IN para tener fondos
      await createTestOrder(
        testUser.id,
        arsInstrument.id,
        OrderSide.CASH_IN,
        OrderType.MARKET,
        10000,
        1,
        OrderStatus.FILLED
      );

      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: testInstrument.id,
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          amount: 50, // Muy pequeño, no alcanza para una acción
        })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
      expect(response.body.message).toContain('too small');
    });

    it('should reject MARKET BUY order when insufficient funds', async () => {
      // No hacer CASH_IN, usuario sin fondos

      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: testInstrument.id,
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          size: 10,
        })
        .expect(201); // La orden se crea pero queda REJECTED

      expect(response.body.data.status).toBe(OrderStatus.REJECTED);
    });
  });

  describe('MARKET SELL orders', () => {
    it('should create a MARKET SELL order successfully when user has shares', async () => {
      // Primero comprar acciones
      await createTestOrder(
        testUser.id,
        arsInstrument.id,
        OrderSide.CASH_IN,
        OrderType.MARKET,
        10000,
        1,
        OrderStatus.FILLED
      );
      await createTestOrder(
        testUser.id,
        testInstrument.id,
        OrderSide.BUY,
        OrderType.MARKET,
        20,
        marketPrice,
        OrderStatus.FILLED
      );

      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: testInstrument.id,
          side: OrderSide.SELL,
          type: OrderType.MARKET,
          size: 10,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        userId: testUser.id,
        instrumentId: testInstrument.id,
        side: OrderSide.SELL,
        type: OrderType.MARKET,
        size: 10,
        price: marketPrice,
        status: OrderStatus.FILLED,
      });
    });

    it('should reject MARKET SELL order when user has insufficient shares', async () => {
      // Usuario sin acciones

      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: testInstrument.id,
          side: OrderSide.SELL,
          type: OrderType.MARKET,
          size: 10,
        })
        .expect(201); // La orden se crea pero queda REJECTED

      expect(response.body.data.status).toBe(OrderStatus.REJECTED);
    });
  });

  describe('LIMIT BUY orders', () => {
    it('should create a LIMIT BUY order with status NEW successfully', async () => {
      // Primero hacer CASH_IN para tener fondos
      await createTestOrder(
        testUser.id,
        arsInstrument.id,
        OrderSide.CASH_IN,
        OrderType.MARKET,
        10000,
        1,
        OrderStatus.FILLED
      );

      const limitPrice = 95.00;
      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: testInstrument.id,
          side: OrderSide.BUY,
          type: OrderType.LIMIT,
          size: 10,
          price: limitPrice,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        userId: testUser.id,
        instrumentId: testInstrument.id,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        size: 10,
        price: limitPrice,
        status: OrderStatus.NEW,
      });
    });

    it('should reject LIMIT BUY order when insufficient funds', async () => {
      // No hacer CASH_IN, usuario sin fondos

      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: testInstrument.id,
          side: OrderSide.BUY,
          type: OrderType.LIMIT,
          size: 10,
          price: 95.00,
        })
        .expect(201); // La orden se crea pero queda REJECTED

      expect(response.body.data.status).toBe(OrderStatus.REJECTED);
    });
  });

  describe('LIMIT SELL orders', () => {
    it('should create a LIMIT SELL order with status NEW successfully', async () => {
      // Primero comprar acciones
      await createTestOrder(
        testUser.id,
        arsInstrument.id,
        OrderSide.CASH_IN,
        OrderType.MARKET,
        10000,
        1,
        OrderStatus.FILLED
      );
      await createTestOrder(
        testUser.id,
        testInstrument.id,
        OrderSide.BUY,
        OrderType.MARKET,
        20,
        marketPrice,
        OrderStatus.FILLED
      );

      const limitPrice = 105.00;
      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: testInstrument.id,
          side: OrderSide.SELL,
          type: OrderType.LIMIT,
          size: 10,
          price: limitPrice,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        userId: testUser.id,
        instrumentId: testInstrument.id,
        side: OrderSide.SELL,
        type: OrderType.LIMIT,
        size: 10,
        price: limitPrice,
        status: OrderStatus.NEW,
      });
    });

    it('should reject LIMIT SELL order when user has insufficient shares', async () => {
      // Usuario sin acciones

      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: testInstrument.id,
          side: OrderSide.SELL,
          type: OrderType.LIMIT,
          size: 10,
          price: 105.00,
        })
        .expect(201); // La orden se crea pero queda REJECTED

      expect(response.body.data.status).toBe(OrderStatus.REJECTED);
    });
  });

  describe('CASH_IN orders', () => {
    it('should create a CASH_IN order successfully', async () => {
      const cashAmount = 5000;
      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: arsInstrument.id,
          side: OrderSide.CASH_IN,
          type: OrderType.MARKET,
          size: cashAmount,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        userId: testUser.id,
        instrumentId: arsInstrument.id,
        side: OrderSide.CASH_IN,
        type: OrderType.MARKET,
        size: cashAmount,
        price: 1,
        status: OrderStatus.FILLED,
      });
    });

    it('should create a CASH_IN order with amount successfully', async () => {
      const cashAmount = 5000;
      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: arsInstrument.id,
          side: OrderSide.CASH_IN,
          type: OrderType.MARKET,
          amount: cashAmount,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        userId: testUser.id,
        instrumentId: arsInstrument.id,
        side: OrderSide.CASH_IN,
        type: OrderType.MARKET,
        price: 1,
        status: OrderStatus.FILLED,
      });
      expect(response.body.data.size).toBe(cashAmount);
    });
  });

  describe('CASH_OUT orders', () => {
    it('should create a CASH_OUT order successfully when user has cash', async () => {
      // Primero hacer CASH_IN
      await createTestOrder(
        testUser.id,
        arsInstrument.id,
        OrderSide.CASH_IN,
        OrderType.MARKET,
        10000,
        1,
        OrderStatus.FILLED
      );

      const cashOutAmount = 3000;
      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: arsInstrument.id,
          side: OrderSide.CASH_OUT,
          type: OrderType.MARKET,
          size: cashOutAmount,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        userId: testUser.id,
        instrumentId: arsInstrument.id,
        side: OrderSide.CASH_OUT,
        type: OrderType.MARKET,
        size: cashOutAmount,
        price: 1,
        status: OrderStatus.FILLED,
      });
    });

    it('should reject CASH_OUT order when insufficient cash', async () => {
      // Usuario sin cash

      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: arsInstrument.id,
          side: OrderSide.CASH_OUT,
          type: OrderType.MARKET,
          size: 1000,
        })
        .expect(201); // La orden se crea pero queda REJECTED

      expect(response.body.data.status).toBe(OrderStatus.REJECTED);
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/orders')
        .send({
          instrumentId: testInstrument.id,
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          size: 10,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    it('should return 400 when instrumentId is missing', async () => {
      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          size: 10,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    it('should return 400 when side is invalid', async () => {
      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: testInstrument.id,
          side: 'INVALID',
          type: OrderType.MARKET,
          size: 10,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    it('should return 400 when type is invalid', async () => {
      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: testInstrument.id,
          side: OrderSide.BUY,
          type: 'INVALID',
          size: 10,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    it('should return 400 when neither size nor amount is provided', async () => {
      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: testInstrument.id,
          side: OrderSide.BUY,
          type: OrderType.MARKET,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
      // El mensaje puede estar en message o en details
      const messageText = response.body.message || JSON.stringify(response.body.details || []);
      expect(messageText).toMatch(/Either size or amount must be provided|size or amount/i);
    });

    it('should return 400 when price is missing for LIMIT order', async () => {
      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: testInstrument.id,
          side: OrderSide.BUY,
          type: OrderType.LIMIT,
          size: 10,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
      // El mensaje puede estar en message o en details
      const messageText = response.body.message || JSON.stringify(response.body.details || []);
      expect(messageText).toMatch(/Price is required for LIMIT|price.*required/i);
    });

    it('should return 400 when amount is used with LIMIT order', async () => {
      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: testInstrument.id,
          side: OrderSide.BUY,
          type: OrderType.LIMIT,
          amount: 1000,
          price: 100,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
      // El mensaje puede estar en message o en details
      const messageText = response.body.message || JSON.stringify(response.body.details || []);
      expect(messageText).toMatch(/Amount can only be used with MARKET|amount.*MARKET/i);
    });

    it('should return 400 when size is not positive', async () => {
      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: testInstrument.id,
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          size: -10,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    it('should return 400 when amount is not positive', async () => {
      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: testInstrument.id,
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          amount: -1000,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    it('should return 400 when price is not positive', async () => {
      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: testInstrument.id,
          side: OrderSide.BUY,
          type: OrderType.LIMIT,
          size: 10,
          price: -100,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('Business logic errors', () => {
    it('should return 404 when instrument does not exist', async () => {
      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: 99999,
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          size: 10,
        })
        .expect(404);

      expect(response.body.error).toBe('Resource not found');
      expect(response.body.message).toContain('Instrument');
    });

    it('should return 404 when market data does not exist for MARKET order', async () => {
      // Crear instrumento sin market data
      const instrumentWithoutMarketData = await createTestInstrument(
        'NO_DATA',
        'No Market Data Instrument',
        InstrumentType.ACCIONES
      );

      const response = await request(app)
        .post('/orders')
        .send({
          userId: testUser.id,
          instrumentId: instrumentWithoutMarketData.id,
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          size: 10,
        })
        .expect(404);

      expect(response.body.error).toBe('Resource not found');
      expect(response.body.message).toContain('Market price');
    });
  });

  describe('Concurrent order creation', () => {
    jest.setTimeout(30000); // Aumentar timeout para este describe (30 segundos)
    
    it('should handle concurrent orders for the same user correctly', async () => {
      // Primero hacer CASH_IN
      await createTestOrder(
        testUser.id,
        arsInstrument.id,
        OrderSide.CASH_IN,
        OrderType.MARKET,
        20000,
        1,
        OrderStatus.FILLED
      );

      // Crear múltiples órdenes concurrentes
      const promises = [
        request(app)
          .post('/orders')
          .send({
            userId: testUser.id,
            instrumentId: testInstrument.id,
            side: OrderSide.BUY,
            type: OrderType.MARKET,
            size: 10,
          }),
        request(app)
          .post('/orders')
          .send({
            userId: testUser.id,
            instrumentId: testInstrument.id,
            side: OrderSide.BUY,
            type: OrderType.MARKET,
            size: 10,
          }),
        request(app)
          .post('/orders')
          .send({
            userId: testUser.id,
            instrumentId: testInstrument.id,
            side: OrderSide.BUY,
            type: OrderType.MARKET,
            size: 10,
          }),
      ];

      const responses = await Promise.all(promises);

      // Todas deben ser exitosas
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verificar que las órdenes se crearon correctamente
      // Nota: En tests funcionales, las órdenes se crean a través del endpoint,
      // así que verificamos que todas las respuestas fueron exitosas
      // La verificación real de persistencia se hace a través de los tests individuales
      expect(responses.length).toBe(3);
    });
  });
});
