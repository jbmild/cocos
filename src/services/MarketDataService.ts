import { AppDataSource } from '../config/database';
import { MarketData } from '../entities/MarketData';
import { Repository, QueryRunner } from 'typeorm';
import { NotFoundError } from '../errors/NotFoundError';

export class MarketDataService {
  private marketDataRepository: Repository<MarketData>;

  constructor() {
    this.marketDataRepository = AppDataSource.getRepository(MarketData);
  }

  /**
   * Obtiene el precio de mercado mas reciente para un instrumento. Throws error si el precio de mercado no esta disponible
   *  instrumentId: ID del instrumento
   *  queryRunner: QueryRunner opcional para usar dentro de una transaccion
   */
  async getMarketPrice(instrumentId: number, queryRunner?: QueryRunner): Promise<number> {
    const manager = queryRunner?.manager || this.marketDataRepository.manager;
    
    const latestMarketData = await manager.findOne(MarketData, {
      where: { instrumentId },
      order: { date: 'DESC' },
    });

    if (!latestMarketData || !latestMarketData.close) {
      throw new NotFoundError(`Market price not available for instrument ${instrumentId}`);
    }

    return Number(latestMarketData.close);
  }
}
