import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { OrderType } from '../enums/OrderType';
import { OrderSide } from '../enums/OrderSide';
import { Repository } from 'typeorm';
import { OrderProcessorFactory } from './order-processors/OrderProcessorFactory';
import { PortfolioService } from './PortfolioService';
import { OrderBuilderFactory } from './order-builders/OrderBuilderFactory';
import { InstrumentService } from './InstrumentService';
import { MarketDataService } from './MarketDataService';

export interface CreateOrderInput {
  userId: number;
  instrumentId: number;
  side: string;
  type: OrderType;
  size?: number;
  amount?: number;
  price?: number;
}

export class OrderService {
  private orderRepository: Repository<Order>;
  private portfolioService: PortfolioService;
  private instrumentService: InstrumentService;
  private marketDataService: MarketDataService;

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
    this.portfolioService = new PortfolioService();
    this.instrumentService = new InstrumentService();
    this.marketDataService = new MarketDataService();
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
    // Obtener datos necesarios de la base de datos
    const instrument = await this.instrumentService.getInstrument(input.instrumentId);

    let marketPrice: number | undefined;
    if (input.type === OrderType.MARKET) {
      if (input.side === OrderSide.CASH_IN || input.side === OrderSide.CASH_OUT) {
        marketPrice = 1;
      } else {
        marketPrice = await this.marketDataService.getMarketPrice(input.instrumentId);
      }
    }

    // Obtener portfolio del usuario
    const portfolio = await this.portfolioService.getPortfolio(input.userId);

    // El builder valida y construye la orden
    const builder = OrderBuilderFactory.create(input.type);
    builder.validateInput(input);
    const { order } = builder.buildOrder(
      input,
      instrument,
      marketPrice
    );

    // El processor valida la orden y determina su estado
    const processor = OrderProcessorFactory.create(order);
    const isValid = processor.validateOrder(
      portfolio.availableCash,
      portfolio.positionsMap
    );
    order.status = processor.determineStatus(isValid);

    // Persistir la orden en la base de datos
    return await this.orderRepository.save(order);
  }
}
