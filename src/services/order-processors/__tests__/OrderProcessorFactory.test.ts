import { OrderProcessorFactory } from '../OrderProcessorFactory';
import { BuyOrderProcessor } from '../BuyOrderProcessor';
import { SellOrderProcessor } from '../SellOrderProcessor';
import { CashInOrderProcessor } from '../CashInOrderProcessor';
import { CashOutOrderProcessor } from '../CashOutOrderProcessor';
import { Order } from '../../../entities/Order';
import { OrderSide } from '../../../enums/OrderSide';

describe('OrderProcessorFactory', () => {
  const createMockOrder = (side: OrderSide): Order => {
    const order = new Order();
    order.side = side;
    return order;
  };

  it('should create BuyOrderProcessor for BUY orders', () => {
    const order = createMockOrder(OrderSide.BUY);
    const processor = OrderProcessorFactory.create(order);
    expect(processor).toBeInstanceOf(BuyOrderProcessor);
  });

  it('should create SellOrderProcessor for SELL orders', () => {
    const order = createMockOrder(OrderSide.SELL);
    const processor = OrderProcessorFactory.create(order);
    expect(processor).toBeInstanceOf(SellOrderProcessor);
  });

  it('should create CashInOrderProcessor for CASH_IN orders', () => {
    const order = createMockOrder(OrderSide.CASH_IN);
    const processor = OrderProcessorFactory.create(order);
    expect(processor).toBeInstanceOf(CashInOrderProcessor);
  });

  it('should create CashOutOrderProcessor for CASH_OUT orders', () => {
    const order = createMockOrder(OrderSide.CASH_OUT);
    const processor = OrderProcessorFactory.create(order);
    expect(processor).toBeInstanceOf(CashOutOrderProcessor);
  });

  it('should throw error for unknown order side', () => {
    const order = createMockOrder('UNKNOWN' as OrderSide);
    expect(() => OrderProcessorFactory.create(order)).toThrow('Unknown order side: UNKNOWN');
  });
});
