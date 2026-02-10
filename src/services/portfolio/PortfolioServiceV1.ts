import { AppDataSource } from '../../config/database';
import { Order } from '../../entities/Order';
import { MarketData } from '../../entities/MarketData';
import { OrderStatus } from '../../enums/OrderStatus';
import { Repository } from 'typeorm';
import { Portfolio } from '../PortfolioService';
import { calculateAvailableCash, calculatePositions, buildPositionsMap } from './portfolioUtils';

/**
 * PortfolioService V1 - Lógica original sin snapshots
 * Calcula el portfolio desde todas las órdenes FILLED del usuario
 */
export class PortfolioServiceV1 {
  private orderRepository: Repository<Order>;
  private marketDataRepository: Repository<MarketData>;

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
    this.marketDataRepository = AppDataSource.getRepository(MarketData);
  }

  /**
   * Obtiene el portfolio calculando desde todas las órdenes (lógica original)
   */
  async getPortfolio(userId: number): Promise<Portfolio> {
    // Obtener todas las órdenes FILLED del usuario
    const filledOrders = await this.orderRepository.find({
      where: {
        userId,
        status: OrderStatus.FILLED,
      },
      relations: ['instrument'],
      order: { datetime: 'ASC' },
    });

    // Calcular pesos cash
    const availableCash = calculateAvailableCash(filledOrders);

    // Calcular mapa de posiciones (reutiliza las ordenes ya cargadas)
    const positionsMap = buildPositionsMap(filledOrders);

    // Calcular posiciones sin cash (reutiliza el positionsMap ya calculado)
    const positions = await calculatePositions(positionsMap, this.marketDataRepository);

    // Calcular valor total (cash + valor de mercado de posiciones)
    const totalValue = availableCash + positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    return {
      totalValue,
      availableCash,
      positions,
      positionsMap,
    };
  }

}
