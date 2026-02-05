import { Order } from '../../entities/Order';
import { OrderProcessor } from './OrderProcessor';
import { BuyOrderProcessor } from './BuyOrderProcessor';
import { SellOrderProcessor } from './SellOrderProcessor';
import { CashInOrderProcessor } from './CashInOrderProcessor';
import { CashOutOrderProcessor } from './CashOutOrderProcessor';

export class OrderProcessorFactory {
  static create(order: Order): OrderProcessor {
    switch (order.side) {
      case 'BUY':
        return new BuyOrderProcessor(order);
      case 'SELL':
        return new SellOrderProcessor(order);
      case 'CASH_IN':
        return new CashInOrderProcessor(order);
      case 'CASH_OUT':
        return new CashOutOrderProcessor(order);
      default:
        throw new Error(`Unknown order side: ${order.side}`);
    }
  }
}
