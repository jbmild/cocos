import { Request, Response } from 'express';
import { OrderController } from '../OrderController';
import { OrderService } from '../../services/OrderService';
import { Order } from '../../entities/Order';
import { OrderStatus } from '../../enums/OrderStatus';
import { OrderSide } from '../../enums/OrderSide';
import { OrderType } from '../../enums/OrderType';
import { ValidationError } from '../../errors/ValidationError';
import { NotFoundError } from '../../errors/NotFoundError';

jest.mock('../../services/OrderService');

describe('OrderController', () => {
  let controller: OrderController;
  let mockOrderService: jest.Mocked<OrderService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    mockOrderService = {
      createOrder: jest.fn(),
    } as any;

    (OrderService as jest.MockedClass<typeof OrderService>).mockImplementation(() => mockOrderService);

    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnThis();

    mockRequest = {
      validated: {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        size: 10,
      },
    } as any;

    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };

    controller = new OrderController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create order successfully and return 201', async () => {
      const mockOrder = new Order();
      mockOrder.id = 1;
      mockOrder.userId = 3;
      mockOrder.instrumentId = 47;
      mockOrder.side = OrderSide.BUY;
      mockOrder.type = OrderType.MARKET;
      mockOrder.size = 10;
      mockOrder.price = 925.85;
      mockOrder.status = OrderStatus.FILLED;
      mockOrder.datetime = new Date();

      mockOrderService.createOrder = jest.fn().mockResolvedValue(mockOrder);

      await controller.createOrder(mockRequest as Request, mockResponse as Response);

      expect(mockOrderService.createOrder).toHaveBeenCalledWith((mockRequest as any).validated);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockOrder,
      });
    });

    it('should return 400 for ValidationError', async () => {
      const validationError = new ValidationError('Amount is too small to buy at least one share');
      mockOrderService.createOrder = jest.fn().mockRejectedValue(validationError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await controller.createOrder(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation error',
        message: 'Amount is too small to buy at least one share',
      });

      consoleSpy.mockRestore();
    });

    it('should return 404 for NotFoundError - Instrument not found', async () => {
      const notFoundError = new NotFoundError('Instrument with id 999 not found');
      mockOrderService.createOrder = jest.fn().mockRejectedValue(notFoundError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await controller.createOrder(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Resource not found',
        message: 'Instrument with id 999 not found',
      });

      consoleSpy.mockRestore();
    });

    it('should return 404 for NotFoundError - Market price not available', async () => {
      const notFoundError = new NotFoundError('Market price not available for instrument 47');
      mockOrderService.createOrder = jest.fn().mockRejectedValue(notFoundError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await controller.createOrder(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Resource not found',
        message: 'Market price not available for instrument 47',
      });

      consoleSpy.mockRestore();
    });

    it('should handle CASH_IN orders correctly', async () => {
      const mockOrder = new Order();
      mockOrder.id = 3;
      mockOrder.userId = 3;
      mockOrder.instrumentId = 66;
      mockOrder.side = OrderSide.CASH_IN;
      mockOrder.type = OrderType.MARKET;
      mockOrder.size = 1000000;
      mockOrder.price = 1;
      mockOrder.status = OrderStatus.FILLED;
      mockOrder.datetime = new Date();

      (mockRequest as any).validated = {
        userId: 3,
        instrumentId: 66,
        side: OrderSide.CASH_IN,
        type: OrderType.MARKET,
        size: 1000000,
      };

      mockOrderService.createOrder = jest.fn().mockResolvedValue(mockOrder);

      await controller.createOrder(mockRequest as Request, mockResponse as Response);

      expect(mockOrderService.createOrder).toHaveBeenCalledWith((mockRequest as any).validated);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockOrder,
      });
    });
  });
});
