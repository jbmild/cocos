import { AppDataSource } from '../config/database';
import { MarketData } from '../entities/MarketData';
import { Repository } from 'typeorm';
import { NotFoundError } from '../errors/NotFoundError';

export class MarketDataService {
  private marketDataRepository: Repository<MarketData>;

  constructor() {
    this.marketDataRepository = AppDataSource.getRepository(MarketData);
  }

  /**
   * Obtiene el precio de mercado mas reciente para un instrumento. Throws error si el precio de mercado no esta disponible
   *  instrumentId: ID del instrumento
   */
  async getMarketPrice(instrumentId: number): Promise<number> {
    const latestMarketData = await this.marketDataRepository.findOne({
      where: { instrumentId },
      order: { date: 'DESC' },
    });

    if (!latestMarketData || !latestMarketData.close) {
      throw new NotFoundError(`Market price not available for instrument ${instrumentId}`);
    }

    return Number(latestMarketData.close);
  }
}
