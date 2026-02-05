export interface Position {
  instrumentId: number;
  ticker: string;
  name: string;
  quantity: number;
  marketValue: number;
  totalReturn: number;
}

export interface Portfolio {
  totalValue: number;
  availableCash: number;
  positions: Position[];
}

export class PortfolioService {
  /**
   * Obtiene el portfolio de un usuario
   * Calcula el valor total, pesos cash y posiciones
   */
  async getPortfolio(userId: number): Promise<Portfolio> {
    return {
      totalValue: 0,
      availableCash: 0,
      positions: [],
    };
  }
}
