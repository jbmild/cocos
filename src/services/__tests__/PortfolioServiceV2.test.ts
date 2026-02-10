import { PortfolioServiceV2 } from '../portfolio/PortfolioServiceV2';
import { AppDataSource } from '../../config/database';
import { Order } from '../../entities/Order';
import { MarketData } from '../../entities/MarketData';
import { Instrument } from '../../entities/Instrument';
import { PortfolioSnapshot } from '../../entities/PortfolioSnapshot';
import { OrderStatus } from '../../enums/OrderStatus';
import { OrderSide } from '../../enums/OrderSide';
import { InstrumentType } from '../../enums/InstrumentType';
import { Repository, LessThan, MoreThanOrEqual, In } from 'typeorm';
import { OrderProcessorFactory } from '../order-processors/OrderProcessorFactory';
import { Portfolio, Position } from '../PortfolioService';

jest.mock('../../config/database');
jest.mock('../order-processors/OrderProcessorFactory');

describe('PortfolioServiceV2', () => {
  let service: PortfolioServiceV2;
  let mockOrderRepository: jest.Mocked<Repository<Order>>;
  let mockMarketDataRepository: jest.Mocked<Repository<MarketData>>;
  let mockPortfolioSnapshotRepository: jest.Mocked<Repository<PortfolioSnapshot>>;
  let mockInstrumentRepository: jest.Mocked<Repository<Instrument>>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };

    mockOrderRepository = {
      find: jest.fn(),
    } as any;

    mockMarketDataRepository = {
      findOne: jest.fn(),
    } as any;

    mockPortfolioSnapshotRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    mockInstrumentRepository = {
      find: jest.fn(),
    } as any;

    (AppDataSource.getRepository as jest.Mock) = jest.fn((entity) => {
      if (entity.name === 'Order') return mockOrderRepository;
      if (entity.name === 'MarketData') return mockMarketDataRepository;
      if (entity.name === 'PortfolioSnapshot') return mockPortfolioSnapshotRepository;
      if (entity.name === 'Instrument') return mockInstrumentRepository;
      return {};
    });

    service = new PortfolioServiceV2();
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });

  const createMockInstrument = (id: number, ticker: string, type: InstrumentType = InstrumentType.ACCIONES): Instrument => {
    const instrument = new Instrument();
    instrument.id = id;
    instrument.ticker = ticker;
    instrument.name = `Instrument ${ticker}`;
    instrument.type = type;
    return instrument;
  };

  const createMockOrder = (
    id: number,
    userId: number,
    instrument: Instrument | null,
    side: OrderSide,
    size: number,
    price: number,
    status: OrderStatus = OrderStatus.FILLED,
    datetime?: Date
  ): Order => {
    const order = new Order();
    order.id = id;
    order.userId = userId;
    (order as any).instrumentId = instrument?.id || undefined;
    (order as any).instrument = instrument || undefined;
    order.side = side;
    order.size = size;
    order.price = price;
    order.status = status;
    order.datetime = datetime || new Date();
    return order;
  };

  describe('getPortfolio', () => {
    beforeEach(() => {
      process.env.ENABLE_PORTFOLIO_SNAPSHOT = 'true';
      service = new PortfolioServiceV2();
    });

    it('should use snapshot when flag is enabled and snapshot exists', async () => {
      const instrument = createMockInstrument(1, 'AAPL');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // Mock snapshot del día anterior
      const snapshot = new PortfolioSnapshot();
      snapshot.id = 1;
      snapshot.userId = 1;
      snapshot.snapshotDate = yesterday;
      snapshot.availableCash = 500;
      snapshot.positionsMap = JSON.stringify({
        '1': { quantity: 10, totalCost: 500, instrumentId: 1 },
      });

      // Mock órdenes del día actual
      const todayOrder = createMockOrder(3, 1, instrument, OrderSide.BUY, 5, 50);
      todayOrder.datetime = new Date(); // Hoy

      const { OrderProcessorFactory } = require('../order-processors/OrderProcessorFactory');
      OrderProcessorFactory.create = jest.fn((order) => ({
        processCash: jest.fn((cash) => cash - 250), // Resta 250 por la compra
        processPositions: jest.fn((positions: Map<number, { quantity: number; totalCost: number; instrument: Instrument }>) => {
          const newPositions = new Map(positions);
          const existing = newPositions.get(1) || { quantity: 0, totalCost: 0, instrument };
          newPositions.set(1, {
            quantity: existing.quantity + 5,
            totalCost: existing.totalCost + 250,
            instrument,
          });
          return newPositions;
        }),
      }));

      const marketData = new MarketData();
      marketData.id = 1;
      marketData.instrumentId = 1;
      marketData.close = 60;
      marketData.date = new Date();
      mockMarketDataRepository.findOne = jest.fn().mockResolvedValue(marketData);

      // Configurar mocks de los repositorios
      mockPortfolioSnapshotRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(snapshot) // Primera llamada: último snapshot (del día anterior)
        .mockResolvedValueOnce(snapshot); // Segunda llamada: verificar si existe snapshot del día anterior (sí existe)

      mockOrderRepository.find = jest
        .fn()
        .mockResolvedValueOnce([todayOrder]) // Para obtener órdenes del día actual
        .mockResolvedValueOnce([]); // Para obtener órdenes desde el snapshot hasta el día anterior (no hay porque el snapshot es del día anterior)

      mockInstrumentRepository.find = jest
        .fn()
        .mockResolvedValueOnce([instrument]); // Para deserializar positionsMap

      mockPortfolioSnapshotRepository.save = jest.fn().mockResolvedValue(snapshot);

      const result = await service.getPortfolio(1);

      expect(result.availableCash).toBe(250); // 500 - 250
      expect(result.positions).toHaveLength(1);
      expect(result.positions[0].quantity).toBe(15); // 10 + 5
      expect(mockPortfolioSnapshotRepository.save).not.toHaveBeenCalled(); // No debería guardar porque ya existe snapshot del día anterior
    });

    it('should calculate from all orders when snapshot does not exist', async () => {
      const instrument = createMockInstrument(1, 'AAPL');
      
      // Mock órdenes históricas (antes de hoy)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const historicalOrder = createMockOrder(1, 1, instrument, OrderSide.BUY, 10, 50);
      historicalOrder.datetime = yesterday;
      
      // Mock órdenes del día actual
      const todayOrder = createMockOrder(2, 1, instrument, OrderSide.BUY, 5, 50);
      todayOrder.datetime = new Date();

      // Configurar mocks de los repositorios
      mockPortfolioSnapshotRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(null) // No hay snapshot del día anterior
        .mockResolvedValueOnce(null); // No existe snapshot de hoy

      mockOrderRepository.find = jest
        .fn()
        .mockResolvedValueOnce([todayOrder]) // Órdenes del día actual
        .mockResolvedValueOnce([historicalOrder]); // Órdenes históricas (antes de hoy)

      const { OrderProcessorFactory } = require('../order-processors/OrderProcessorFactory');
      OrderProcessorFactory.create = jest.fn((order) => {
        const isCashIn = order.side === OrderSide.CASH_IN;
        const isBuy = order.side === OrderSide.BUY;
        return {
          processCash: jest.fn((cash) => {
            if (isCashIn) return cash + 10000;
            if (isBuy) return cash - (order.size! * order.price!);
            return cash;
          }),
          processPositions: jest.fn((positions: Map<number, { quantity: number; totalCost: number; instrument: Instrument }>) => {
            if (isBuy) {
              const newPositions = new Map(positions);
              const existing = newPositions.get(1) || { quantity: 0, totalCost: 0, instrument };
              newPositions.set(1, {
                quantity: existing.quantity + order.size!,
                totalCost: existing.totalCost + (order.size! * order.price!),
                instrument,
              });
              return newPositions;
            }
            return positions;
          }),
        };
      });

      const marketData = new MarketData();
      marketData.id = 1;
      marketData.instrumentId = 1;
      marketData.close = 60;
      marketData.date = new Date();
      mockMarketDataRepository.findOne = jest.fn().mockResolvedValue(marketData);

      // Agregar CASH_IN al inicio de las órdenes históricas para tener fondos
      const cashInInstrument = createMockInstrument(66, 'ARS', InstrumentType.MONEDA);
      const cashInOrder = createMockOrder(0, 1, cashInInstrument, OrderSide.CASH_IN, 10000, 1);
      cashInOrder.datetime = new Date(yesterday.getTime() - 86400000); // Un día antes de ayer
      
      // Actualizar el mock para incluir CASH_IN
      mockOrderRepository.find = jest
        .fn()
        .mockResolvedValueOnce([todayOrder]) // Órdenes del día actual
        .mockResolvedValueOnce([cashInOrder, historicalOrder]); // Órdenes históricas con CASH_IN

      mockInstrumentRepository.find = jest.fn().mockResolvedValue([instrument]);

      mockPortfolioSnapshotRepository.save = jest.fn().mockResolvedValue({});

      const result = await service.getPortfolio(1);

      expect(result.positions).toHaveLength(1);
      expect(result.positions[0].quantity).toBe(15); // 10 + 5
      expect(mockPortfolioSnapshotRepository.save).toHaveBeenCalled(); // Debería guardar snapshot del día anterior
    });

    it('should use last snapshot and calculate from that date when snapshot of yesterday does not exist', async () => {
      const instrument = createMockInstrument(1, 'AAPL');
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(0, 0, 0, 0);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // Mock snapshot de hace 2 días
      const oldSnapshot = new PortfolioSnapshot();
      oldSnapshot.id = 1;
      oldSnapshot.userId = 1;
      oldSnapshot.snapshotDate = twoDaysAgo;
      oldSnapshot.availableCash = 1000;
      oldSnapshot.positionsMap = JSON.stringify({
        '1': { quantity: 5, totalCost: 250, instrumentId: 1 },
      });

      // Mock órdenes del día anterior (entre el snapshot y ayer)
      const yesterdayOrder = createMockOrder(2, 1, instrument, OrderSide.BUY, 5, 50);
      yesterdayOrder.datetime = new Date(yesterday);

      // Mock órdenes del día actual
      const todayOrder = createMockOrder(3, 1, instrument, OrderSide.BUY, 3, 50);
      todayOrder.datetime = new Date();

      const { OrderProcessorFactory } = require('../order-processors/OrderProcessorFactory');
      OrderProcessorFactory.create = jest.fn((order) => ({
        processCash: jest.fn((cash) => cash - (order.size! * order.price!)),
        processPositions: jest.fn((positions: Map<number, { quantity: number; totalCost: number; instrument: Instrument }>) => {
          const newPositions = new Map(positions);
          const existing = newPositions.get(1) || { quantity: 0, totalCost: 0, instrument };
          newPositions.set(1, {
            quantity: existing.quantity + order.size!,
            totalCost: existing.totalCost + (order.size! * order.price!),
            instrument,
          });
          return newPositions;
        }),
      }));

      const marketData = new MarketData();
      marketData.id = 1;
      marketData.instrumentId = 1;
      marketData.close = 60;
      marketData.date = new Date();
      mockMarketDataRepository.findOne = jest.fn().mockResolvedValue(marketData);

      // Configurar mocks
      mockPortfolioSnapshotRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(oldSnapshot) // Último snapshot (hace 2 días)
        .mockResolvedValueOnce(null); // No hay snapshot del día anterior

      mockOrderRepository.find = jest
        .fn()
        .mockResolvedValueOnce([todayOrder]) // Órdenes del día actual
        .mockResolvedValueOnce([yesterdayOrder]); // Órdenes desde el snapshot hasta el día anterior

      mockInstrumentRepository.find = jest
        .fn()
        .mockResolvedValueOnce([instrument]); // Para deserializar positionsMap

      mockPortfolioSnapshotRepository.save = jest.fn().mockResolvedValue({});

      const result = await service.getPortfolio(1);

      expect(result.positions).toHaveLength(1);
      expect(result.positions[0].quantity).toBe(13); // 5 (snapshot) + 5 (ayer) + 3 (hoy)
      expect(mockPortfolioSnapshotRepository.save).toHaveBeenCalled(); // Debería guardar porque hubo órdenes desde el último snapshot
    });

    it('should handle empty today orders correctly', async () => {
      const instrument = createMockInstrument(1, 'AAPL');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const snapshot = new PortfolioSnapshot();
      snapshot.id = 1;
      snapshot.userId = 1;
      snapshot.snapshotDate = yesterday;
      snapshot.availableCash = 500;
      snapshot.positionsMap = JSON.stringify({
        '1': { quantity: 10, totalCost: 500, instrumentId: 1 },
      });

      // Configurar mocks de los repositorios
      mockPortfolioSnapshotRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(snapshot) // Primera llamada: último snapshot (del día anterior)
        .mockResolvedValueOnce(snapshot); // Segunda llamada: verificar si existe snapshot del día anterior (sí existe)

      mockOrderRepository.find = jest
        .fn()
        .mockResolvedValueOnce([]) // Sin órdenes del día actual
        .mockResolvedValueOnce([]); // Sin órdenes desde el snapshot hasta el día anterior

      mockInstrumentRepository.find = jest
        .fn()
        .mockResolvedValueOnce([instrument]); // Para deserializar positionsMap

      mockPortfolioSnapshotRepository.save = jest.fn().mockResolvedValue(snapshot);

      const marketData = new MarketData();
      marketData.id = 1;
      marketData.instrumentId = 1;
      marketData.close = 60;
      marketData.date = new Date();
      mockMarketDataRepository.findOne = jest.fn().mockResolvedValue(marketData);

      const result = await service.getPortfolio(1);

      expect(result.availableCash).toBe(500);
      expect(result.positions).toHaveLength(1);
      expect(result.positions[0].quantity).toBe(10);
      expect(mockPortfolioSnapshotRepository.save).not.toHaveBeenCalled(); // No debería guardar porque ya existe snapshot del día anterior
    });

    it('should not save snapshot when no orders occurred since last snapshot', async () => {
      const instrument = createMockInstrument(1, 'AAPL');
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(0, 0, 0, 0);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // Mock snapshot de hace 2 días
      const oldSnapshot = new PortfolioSnapshot();
      oldSnapshot.id = 1;
      oldSnapshot.userId = 1;
      oldSnapshot.snapshotDate = twoDaysAgo;
      oldSnapshot.availableCash = 1000;
      oldSnapshot.positionsMap = JSON.stringify({
        '1': { quantity: 5, totalCost: 250, instrumentId: 1 },
      });

      // No hay órdenes del día actual ni desde el snapshot hasta el día anterior
      const marketData = new MarketData();
      marketData.id = 1;
      marketData.instrumentId = 1;
      marketData.close = 60;
      marketData.date = new Date();
      mockMarketDataRepository.findOne = jest.fn().mockResolvedValue(marketData);

      // Configurar mocks
      mockPortfolioSnapshotRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(oldSnapshot) // Último snapshot (hace 2 días)
        .mockResolvedValueOnce(null); // No hay snapshot del día anterior

      mockOrderRepository.find = jest
        .fn()
        .mockResolvedValueOnce([]) // Sin órdenes del día actual
        .mockResolvedValueOnce([]); // Sin órdenes desde el snapshot hasta el día anterior

      mockInstrumentRepository.find = jest
        .fn()
        .mockResolvedValueOnce([instrument]); // Para deserializar positionsMap

      mockPortfolioSnapshotRepository.save = jest.fn().mockResolvedValue({});

      const result = await service.getPortfolio(1);

      expect(result.availableCash).toBe(1000);
      expect(result.positions).toHaveLength(1);
      expect(result.positions[0].quantity).toBe(5);
      expect(mockPortfolioSnapshotRepository.save).not.toHaveBeenCalled(); // No debería guardar porque no hubo órdenes desde el último snapshot
    });

    it('should save snapshot when orders occurred since last snapshot', async () => {
      const instrument = createMockInstrument(1, 'AAPL');
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(0, 0, 0, 0);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // Mock snapshot de hace 2 días
      const oldSnapshot = new PortfolioSnapshot();
      oldSnapshot.id = 1;
      oldSnapshot.userId = 1;
      oldSnapshot.snapshotDate = twoDaysAgo;
      oldSnapshot.availableCash = 1000;
      oldSnapshot.positionsMap = JSON.stringify({
        '1': { quantity: 5, totalCost: 250, instrumentId: 1 },
      });

      // Mock órdenes del día anterior (entre el snapshot y ayer) - HAY órdenes
      const yesterdayOrder = createMockOrder(2, 1, instrument, OrderSide.BUY, 5, 50);
      yesterdayOrder.datetime = new Date(yesterday);

      // No hay órdenes del día actual
      const { OrderProcessorFactory } = require('../order-processors/OrderProcessorFactory');
      OrderProcessorFactory.create = jest.fn((order) => ({
        processCash: jest.fn((cash) => cash - (order.size! * order.price!)),
        processPositions: jest.fn((positions: Map<number, { quantity: number; totalCost: number; instrument: Instrument }>) => {
          const newPositions = new Map(positions);
          const existing = newPositions.get(1) || { quantity: 0, totalCost: 0, instrument };
          newPositions.set(1, {
            quantity: existing.quantity + order.size!,
            totalCost: existing.totalCost + (order.size! * order.price!),
            instrument,
          });
          return newPositions;
        }),
      }));

      const marketData = new MarketData();
      marketData.id = 1;
      marketData.instrumentId = 1;
      marketData.close = 60;
      marketData.date = new Date();
      mockMarketDataRepository.findOne = jest.fn().mockResolvedValue(marketData);

      // Configurar mocks
      mockPortfolioSnapshotRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(oldSnapshot) // Último snapshot (hace 2 días)
        .mockResolvedValueOnce(null); // No hay snapshot del día anterior

      mockOrderRepository.find = jest
        .fn()
        .mockResolvedValueOnce([]) // Sin órdenes del día actual
        .mockResolvedValueOnce([yesterdayOrder]); // HAY órdenes desde el snapshot hasta el día anterior

      mockInstrumentRepository.find = jest
        .fn()
        .mockResolvedValueOnce([instrument]); // Para deserializar positionsMap

      mockPortfolioSnapshotRepository.save = jest.fn().mockResolvedValue({});

      const result = await service.getPortfolio(1);

      expect(result.availableCash).toBe(750); // 1000 - 250
      expect(result.positions).toHaveLength(1);
      expect(result.positions[0].quantity).toBe(10); // 5 + 5
      expect(mockPortfolioSnapshotRepository.save).toHaveBeenCalled(); // Debería guardar porque hubo órdenes desde el último snapshot
    });
  });
});
