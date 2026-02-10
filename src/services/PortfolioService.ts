import { Instrument } from '../entities/Instrument';
import { PortfolioServiceV1 } from './portfolio/PortfolioServiceV1';
import { PortfolioServiceV2 } from './portfolio/PortfolioServiceV2';

export interface Position {
  instrumentId: number;
  ticker: string;
  name: string;
  quantity: number;
  marketValue: number;
  totalReturn: number;
  dailyReturn: number;
}

export interface Portfolio {
  totalValue: number;
  availableCash: number;
  positions: Position[];
  positionsMap: Map<number, { quantity: number; totalCost: number; instrument: Instrument }>;
}

/**
 * PortfolioService - Wrapper que delega a V1 o V2 según el feature flag
 * Siempre se llama a este servicio, que verifica el flag y delega al servicio correspondiente
 */
export class PortfolioService {
  private v1Service: PortfolioServiceV1;
  private v2Service: PortfolioServiceV2;
  private readonly enableSnapshot: boolean;

  constructor() {
    this.v1Service = new PortfolioServiceV1();
    this.v2Service = new PortfolioServiceV2();
    this.enableSnapshot = process.env.ENABLE_PORTFOLIO_SNAPSHOT === 'true';
  }

  /**
   * Obtiene el portfolio de un usuario: valor total, pesos cash y posiciones
   * Verifica el feature flag y delega a V1 (sin snapshots) o V2 (con snapshots)
   */
  async getPortfolio(userId: number): Promise<Portfolio> {
    if (this.enableSnapshot) {
      return this.v2Service.getPortfolio(userId);
    }

    return this.v1Service.getPortfolio(userId);
  }
}
