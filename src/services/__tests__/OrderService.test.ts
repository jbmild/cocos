import { OrderService, CreateOrderInput } from '../OrderService';
import { AppDataSource } from '../../config/database';
import { Order } from '../../entities/Order';
import { Instrument } from '../../entities/Instrument';
import { OrderStatus } from '../../enums/OrderStatus';
import { OrderSide } from '../../enums/OrderSide';
import { OrderType } from '../../enums/OrderType';
import { InstrumentType } from '../../enums/InstrumentType';
import { Repository, QueryRunner } from 'typeorm';
import { PortfolioService } from '../PortfolioService';
import { InstrumentService } from '../InstrumentService';
import { MarketDataService } from '../MarketDataService';
import { OrderBuilderFactory } from '../order-builders/OrderBuilderFactory';
import { OrderProcessorFactory } from '../order-processors/OrderProcessorFactory';
import { LockService } from '../LockService';
import { ValidationError } from '../../errors/ValidationError';
import { NotFoundError } from '../../errors/NotFoundError';

jest.mock('../../config/database');
jest.mock('../PortfolioService');
jest.mock('../InstrumentService');
jest.mock('../MarketDataService');
jest.mock('../order-builders/OrderBuilderFactory');
jest.mock('../order-processors/OrderProcessorFactory');
jest.mock('../LockService');

describe('OrderService', () => {
  let service: OrderService;
  let mockOrderRepository: jest.Mocked<Repository<Order>>;
  let mockPortfolioService: jest.Mocked<PortfolioService>;
  let mockInstrumentService: jest.Mocked<InstrumentService>;
  let mockMarketDataService: jest.Mocked<MarketDataService>;
  let mockBuilder: any;
  let mockProcessor: any;
  let mockQueryRunner: jest.Mocked<QueryRunner>;

  beforeEach(() => {
    mockOrderRepository = {
      save: jest.fn(),
    } as any;

    mockPortfolioService = {
      getPortfolio: jest.fn(),
    } as any;

    mockInstrumentService = {
      getInstrument: jest.fn(),
    } as any;

    mockMarketDataService = {
      getMarketPrice: jest.fn(),
    } as any;

    mockBuilder = {
      validateInput: jest.fn(),
      buildOrder: jest.fn(),
    };

    mockProcessor = {
      validateOrder: jest.fn(),
      determineStatus: jest.fn(),
    };

    const mockManagerSave = jest.fn();
    const mockManager = {
      save: mockManagerSave,
    };

    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      isTransactionActive: true, // Simular que la transacción está activa
      manager: mockManager as any,
    } as any;

    (AppDataSource.getRepository as jest.Mock) = jest.fn(() => mockOrderRepository);
    (AppDataSource.createQueryRunner as jest.Mock) = jest.fn(() => mockQueryRunner);
    (PortfolioService as jest.MockedClass<typeof PortfolioService>).mockImplementation(() => mockPortfolioService);
    (InstrumentService as jest.MockedClass<typeof InstrumentService>).mockImplementation(() => mockInstrumentService);
    (MarketDataService as jest.MockedClass<typeof MarketDataService>).mockImplementation(() => mockMarketDataService);
    (OrderBuilderFactory.create as jest.Mock) = jest.fn(() => mockBuilder);
    (OrderProcessorFactory.create as jest.Mock) = jest.fn(() => mockProcessor);
    (LockService.acquireUserLock as jest.Mock) = jest.fn().mockResolvedValue(undefined);

    service = new OrderService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockInstrument = (id: number, ticker: string, type: InstrumentType = InstrumentType.ACCIONES): Instrument => {
    const instrument = new Instrument();
    instrument.id = id;
    instrument.ticker = ticker;
    instrument.name = `Instrument ${ticker}`;
    instrument.type = type;
    return instrument;
  };

  const createMockOrder = (input: CreateOrderInput, status: OrderStatus): Order => {
    const order = new Order();
    order.id = 1;
    order.userId = input.userId;
    order.instrumentId = input.instrumentId;
    order.side = input.side as any;
    order.type = input.type;
    order.size = input.size || 10;
    order.price = input.price || 925.85;
    order.status = status;
    order.datetime = new Date();
    return order;
  };

  describe('createOrder', () => {
    it('should create MARKET BUY order successfully', async () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        size: 10,
      };

      const instrument = createMockInstrument(47, 'MOLI');
      const mockOrder = createMockOrder(input, OrderStatus.FILLED);
      const mockPortfolio = {
        totalValue: 1000,
        availableCash: 10000,
        positions: [],
        positionsMap: new Map(),
      };

      mockInstrumentService.getInstrument.mockResolvedValue(instrument);
      mockMarketDataService.getMarketPrice.mockResolvedValue(925.85);
      mockPortfolioService.getPortfolio.mockResolvedValue(mockPortfolio as any);
      mockBuilder.buildOrder.mockReturnValue({ order: mockOrder, marketPrice: 925.85 });
      mockProcessor.validateOrder.mockReturnValue(true);
      mockProcessor.determineStatus.mockReturnValue(OrderStatus.FILLED);
      (mockQueryRunner.manager.save as jest.Mock).mockResolvedValue(mockOrder);

      const result = await service.createOrder(input);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(LockService.acquireUserLock).toHaveBeenCalledWith(mockQueryRunner, 3);
      expect(mockInstrumentService.getInstrument).toHaveBeenCalledWith(47, mockQueryRunner);
      expect(mockMarketDataService.getMarketPrice).toHaveBeenCalledWith(47, mockQueryRunner);
      expect(mockPortfolioService.getPortfolio).toHaveBeenCalledWith(3);
      expect(mockBuilder.validateInput).toHaveBeenCalledWith(input);
      expect(mockBuilder.buildOrder).toHaveBeenCalledWith(input, instrument, 925.85);
      expect(mockProcessor.validateOrder).toHaveBeenCalledWith(10000, mockPortfolio.positionsMap);
      expect(mockProcessor.determineStatus).toHaveBeenCalledWith(true);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(Order, mockOrder);
      expect(result).toEqual(mockOrder);
    });

    it('should create LIMIT BUY order successfully', async () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        size: 20,
        price: 900,
      };

      const instrument = createMockInstrument(47, 'MOLI');
      const mockOrder = createMockOrder(input, OrderStatus.NEW);
      const mockPortfolio = {
        totalValue: 1000,
        availableCash: 20000,
        positions: [],
        positionsMap: new Map(),
      };

      mockInstrumentService.getInstrument.mockResolvedValue(instrument);
      mockPortfolioService.getPortfolio.mockResolvedValue(mockPortfolio as any);
      mockBuilder.buildOrder.mockReturnValue({ order: mockOrder });
      mockProcessor.validateOrder.mockReturnValue(true);
      mockProcessor.determineStatus.mockReturnValue(OrderStatus.NEW);
      (mockQueryRunner.manager.save as jest.Mock).mockResolvedValue(mockOrder);

      const result = await service.createOrder(input);

      expect(mockMarketDataService.getMarketPrice).not.toHaveBeenCalled();
      expect(mockProcessor.determineStatus).toHaveBeenCalledWith(true);
      expect(result.status).toBe(OrderStatus.NEW);
    });

    it('should handle CASH_IN order without fetching market price', async () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 66,
        side: OrderSide.CASH_IN,
        type: OrderType.MARKET,
        size: 1000000,
      };

      const instrument = createMockInstrument(66, 'ARS', InstrumentType.MONEDA);
      const mockOrder = createMockOrder(input, OrderStatus.FILLED);
      mockOrder.price = 1;
      const mockPortfolio = {
        totalValue: 0,
        availableCash: 0,
        positions: [],
        positionsMap: new Map(),
      };

      mockInstrumentService.getInstrument.mockResolvedValue(instrument);
      mockPortfolioService.getPortfolio.mockResolvedValue(mockPortfolio as any);
      mockBuilder.buildOrder.mockReturnValue({ order: mockOrder, marketPrice: 1 });
      mockProcessor.validateOrder.mockReturnValue(true);
      mockProcessor.determineStatus.mockReturnValue(OrderStatus.FILLED);
      (mockQueryRunner.manager.save as jest.Mock).mockResolvedValue(mockOrder);

      const result = await service.createOrder(input);

      expect(mockMarketDataService.getMarketPrice).not.toHaveBeenCalled();
      expect(result.status).toBe(OrderStatus.FILLED);
    });

    it('should handle CASH_OUT order without fetching market price', async () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 66,
        side: OrderSide.CASH_OUT,
        type: OrderType.MARKET,
        size: 50000,
      };

      const instrument = createMockInstrument(66, 'ARS', InstrumentType.MONEDA);
      const mockOrder = createMockOrder(input, OrderStatus.FILLED);
      mockOrder.price = 1;
      const mockPortfolio = {
        totalValue: 1000000,
        availableCash: 1000000,
        positions: [],
        positionsMap: new Map(),
      };

      mockInstrumentService.getInstrument.mockResolvedValue(instrument);
      mockPortfolioService.getPortfolio.mockResolvedValue(mockPortfolio as any);
      mockBuilder.buildOrder.mockReturnValue({ order: mockOrder, marketPrice: 1 });
      mockProcessor.validateOrder.mockReturnValue(true);
      mockProcessor.determineStatus.mockReturnValue(OrderStatus.FILLED);
      (mockQueryRunner.manager.save as jest.Mock).mockResolvedValue(mockOrder);

      const result = await service.createOrder(input);

      expect(mockMarketDataService.getMarketPrice).not.toHaveBeenCalled();
      expect(result.status).toBe(OrderStatus.FILLED);
    });

    it('should handle rollback on error', async () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        size: 10,
      };

      const instrument = createMockInstrument(47, 'MOLI');
      const error = new Error('Database error');
      mockInstrumentService.getInstrument.mockResolvedValue(instrument);
      mockMarketDataService.getMarketPrice.mockRejectedValue(error);

      await expect(service.createOrder(input)).rejects.toThrow('Database error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should acquire lock before processing order', async () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        size: 10,
      };

      const instrument = createMockInstrument(47, 'MOLI');
      const mockOrder = createMockOrder(input, OrderStatus.FILLED);
      const mockPortfolio = {
        totalValue: 1000,
        availableCash: 10000,
        positions: [],
        positionsMap: new Map(),
      };

      mockInstrumentService.getInstrument.mockResolvedValue(instrument);
      mockMarketDataService.getMarketPrice.mockResolvedValue(925.85);
      mockPortfolioService.getPortfolio.mockResolvedValue(mockPortfolio as any);
      mockBuilder.buildOrder.mockReturnValue({ order: mockOrder, marketPrice: 925.85 });
      mockProcessor.validateOrder.mockReturnValue(true);
      mockProcessor.determineStatus.mockReturnValue(OrderStatus.FILLED);
      (mockQueryRunner.manager.save as jest.Mock).mockResolvedValue(mockOrder);

      await service.createOrder(input);

      expect(LockService.acquireUserLock).toHaveBeenCalledWith(mockQueryRunner, 3);
      // Verificar que el lock se adquiere antes de obtener el instrumento
      const lockCallOrder = (LockService.acquireUserLock as jest.Mock).mock.invocationCallOrder[0];
      const instrumentCallOrder = (mockInstrumentService.getInstrument as jest.Mock).mock.invocationCallOrder[0];
      expect(lockCallOrder).toBeLessThan(instrumentCallOrder);
    });

    it('should save order with correct status', async () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        size: 10,
      };

      const instrument = createMockInstrument(47, 'MOLI');
      const mockOrder = createMockOrder(input, OrderStatus.FILLED);
      const mockPortfolio = {
        totalValue: 1000,
        availableCash: 10000,
        positions: [],
        positionsMap: new Map(),
      };

      mockInstrumentService.getInstrument.mockResolvedValue(instrument);
      mockMarketDataService.getMarketPrice.mockResolvedValue(925.85);
      mockPortfolioService.getPortfolio.mockResolvedValue(mockPortfolio as any);
      mockBuilder.buildOrder.mockReturnValue({ order: mockOrder, marketPrice: 925.85 });
      mockProcessor.validateOrder.mockReturnValue(true);
      mockProcessor.determineStatus.mockReturnValue(OrderStatus.FILLED);
      (mockQueryRunner.manager.save as jest.Mock).mockResolvedValue(mockOrder);

      await service.createOrder(input);

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          status: OrderStatus.FILLED,
        })
      );
    });
  });

  describe('cancelOrder', () => {
    const createMockOrderForCancel = (
      id: number,
      userId: number,
      status: OrderStatus = OrderStatus.NEW
    ): Order => {
      const order = new Order();
      order.id = id;
      order.userId = userId;
      order.instrumentId = 47;
      order.side = OrderSide.BUY;
      order.type = OrderType.LIMIT;
      order.size = 10;
      order.price = 900;
      order.status = status;
      order.datetime = new Date();
      return order;
    };

    it('should cancel order successfully when order is NEW', async () => {
      const orderId = 1;
      const userId = 3;
      const mockOrder = createMockOrderForCancel(orderId, userId, OrderStatus.NEW);
      const cancelledOrder = { ...mockOrder, status: OrderStatus.CANCELLED };

      (mockQueryRunner.manager.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockOrder);
      (mockQueryRunner.manager.save as jest.Mock) = jest.fn().mockResolvedValue(cancelledOrder);

      const result = await service.cancelOrder(orderId);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(LockService.acquireUserLock).toHaveBeenCalledWith(mockQueryRunner, userId);
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(Order, {
        where: { id: orderId },
      });
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          id: orderId,
          userId,
          status: OrderStatus.CANCELLED,
        })
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw NotFoundError when order does not exist', async () => {
      const orderId = 999;

      (mockQueryRunner.manager.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);

      await expect(service.cancelOrder(orderId)).rejects.toThrow(NotFoundError);
      await expect(service.cancelOrder(orderId)).rejects.toThrow(`Order with id ${orderId} not found`);

      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(Order, {
        where: { id: orderId },
      });
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw ValidationError when order status is not NEW', async () => {
      const orderId = 1;
      const userId = 3;
      const mockOrder = createMockOrderForCancel(orderId, userId, OrderStatus.FILLED);

      (mockQueryRunner.manager.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockOrder);

      await expect(service.cancelOrder(orderId)).rejects.toThrow(ValidationError);
      await expect(service.cancelOrder(orderId)).rejects.toThrow(
        'Cannot cancel order with status FILLED. Only orders with status NEW can be cancelled'
      );

      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
