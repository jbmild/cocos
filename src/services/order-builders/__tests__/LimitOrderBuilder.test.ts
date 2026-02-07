import { LimitOrderBuilder } from '../LimitOrderBuilder';
import { CreateOrderInput } from '../../OrderService';
import { Order } from '../../../entities/Order';
import { Instrument } from '../../../entities/Instrument';
import { OrderType } from '../../../enums/OrderType';
import { OrderSide } from '../../../enums/OrderSide';
import { InstrumentType } from '../../../enums/InstrumentType';
import { ValidationError } from '../../../errors/ValidationError';

describe('LimitOrderBuilder', () => {
  let builder: LimitOrderBuilder;
  let mockInstrument: Instrument;

  beforeEach(() => {
    builder = new LimitOrderBuilder();
    mockInstrument = new Instrument();
    mockInstrument.id = 47;
    mockInstrument.ticker = 'MOLI';
    mockInstrument.name = 'Molinos Río de la Plata';
    mockInstrument.type = InstrumentType.ACCIONES;
  });

  describe('validateInput', () => {
    it('should not throw when price and size are provided', () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        size: 20,
        price: 900,
      };

      expect(() => builder.validateInput(input)).not.toThrow();
    });

    it('should throw ValidationError when price is not provided', () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        size: 20,
      };

      expect(() => builder.validateInput(input)).toThrow(ValidationError);
      expect(() => builder.validateInput(input)).toThrow('Price is required for LIMIT orders');
    });

    it('should throw ValidationError when size is not provided', () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        price: 900,
      };

      expect(() => builder.validateInput(input)).toThrow(ValidationError);
      expect(() => builder.validateInput(input)).toThrow('Size is required for LIMIT orders');
    });

    it('should throw ValidationError when both price and size are missing', () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
      };

      expect(() => builder.validateInput(input)).toThrow(ValidationError);
    });
  });

  describe('buildOrder', () => {
    it('should build order with provided size and price', () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        size: 20,
        price: 900,
      };

      const result = builder.buildOrder(input, mockInstrument);

      expect(result.order.userId).toBe(3);
      expect(result.order.instrumentId).toBe(47);
      expect(result.order.side).toBe(OrderSide.BUY);
      expect(result.order.type).toBe(OrderType.LIMIT);
      expect(result.order.size).toBe(20);
      expect(result.order.price).toBe(900);
      expect(result.order.instrument).toEqual(mockInstrument);
      expect(result.order.datetime).toBeInstanceOf(Date);
      expect(result.marketPrice).toBeUndefined();
    });

    it('should build SELL order correctly', () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.SELL,
        type: OrderType.LIMIT,
        size: 10,
        price: 950,
      };

      const result = builder.buildOrder(input, mockInstrument);

      expect(result.order.side).toBe(OrderSide.SELL);
      expect(result.order.size).toBe(10);
      expect(result.order.price).toBe(950);
    });

    it('should ignore marketPrice parameter', () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        size: 20,
        price: 900,
      };

      const result = builder.buildOrder(input, mockInstrument, 925.85);

      // Should use the provided price, not marketPrice
      expect(result.order.price).toBe(900);
      expect(result.marketPrice).toBeUndefined();
    });

    it('should set datetime to current date', () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        size: 20,
        price: 900,
      };

      const beforeDate = new Date();
      const result = builder.buildOrder(input, mockInstrument);
      const afterDate = new Date();

      expect(result.order.datetime).toBeInstanceOf(Date);
      expect(result.order.datetime.getTime()).toBeGreaterThanOrEqual(beforeDate.getTime());
      expect(result.order.datetime.getTime()).toBeLessThanOrEqual(afterDate.getTime());
    });
  });
});
