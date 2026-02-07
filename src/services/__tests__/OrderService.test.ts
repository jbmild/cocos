import { OrderService, CreateOrderInput } from '../OrderService';
import { AppDataSource } from '../../config/database';
import { Order } from '../../entities/Order';
import { Instrument } from '../../entities/Instrument';
import { OrderStatus } from '../../enums/OrderStatus';
import { OrderSide } from '../../enums/OrderSide';
import { OrderType } from '../../enums/OrderType';
import { InstrumentType } from '../../enums/InstrumentType';
import { Repository } from 'typeorm';
import { PortfolioService } from '../PortfolioService';
import { InstrumentService } from '../InstrumentService';
import { MarketDataService } from '../MarketDataService';
import { OrderBuilderFactory } from '../order-builders/OrderBuilderFactory';
import { OrderProcessorFactory } from '../order-processors/OrderProcessorFactory';
import { ValidationError } from '../../errors/ValidationError';
import { NotFoundError } from '../../errors/NotFoundError';

jest.mock('../../config/database');
jest.mock('../PortfolioService');
jest.mock('../InstrumentService');
jest.mock('../MarketDataService');
jest.mock('../order-builders/OrderBuilderFactory');
jest.mock('../order-processors/OrderProcessorFactory');

describe('OrderService', () => {
  let service: OrderService;
  let mockOrderRepository: jest.Mocked<Repository<Order>>;
  let mockPortfolioService: jest.Mocked<PortfolioService>;
  let mockInstrumentService: jest.Mocked<InstrumentService>;
  let mockMarketDataService: jest.Mocked<MarketDataService>;
  let mockBuilder: any;
  let mockProcessor: any;

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

    (AppDataSource.getRepository as jest.Mock) = jest.fn(() => mockOrderRepository);
    (PortfolioService as jest.MockedClass<typeof PortfolioService>).mockImplementation(() => mockPortfolioService);
    (InstrumentService as jest.MockedClass<typeof InstrumentService>).mockImplementation(() => mockInstrumentService);
    (MarketDataService as jest.MockedClass<typeof MarketDataService>).mockImplementation(() => mockMarketDataService);
    (OrderBuilderFactory.create as jest.Mock) = jest.fn(() => mockBuilder);
    (OrderProcessorFactory.create as jest.Mock) = jest.fn(() => mockProcessor);

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
      mockOrderRepository.save.mockResolvedValue(mockOrder);

      const result = await service.createOrder(input);

      expect(mockInstrumentService.getInstrument).toHaveBeenCalledWith(47);
      expect(mockMarketDataService.getMarketPrice).toHaveBeenCalledWith(47);
      expect(mockPortfolioService.getPortfolio).toHaveBeenCalledWith(3);
      expect(mockBuilder.validateInput).toHaveBeenCalledWith(input);
      expect(mockBuilder.buildOrder).toHaveBeenCalledWith(input, instrument, 925.85);
      expect(mockProcessor.validateOrder).toHaveBeenCalledWith(10000, mockPortfolio.positionsMap);
      expect(mockProcessor.determineStatus).toHaveBeenCalledWith(true);
      expect(mockOrderRepository.save).toHaveBeenCalledWith(mockOrder);
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
      mockOrderRepository.save.mockResolvedValue(mockOrder);

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
      mockOrderRepository.save.mockResolvedValue(mockOrder);

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
      mockOrderRepository.save.mockResolvedValue(mockOrder);

      const result = await service.createOrder(input);

      expect(mockMarketDataService.getMarketPrice).not.toHaveBeenCalled();
      expect(result.status).toBe(OrderStatus.FILLED);
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
      mockOrderRepository.save.mockResolvedValue(mockOrder);

      await service.createOrder(input);

      expect(mockOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.FILLED,
        })
      );
    });
  });
});
