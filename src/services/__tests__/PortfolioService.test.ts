import { PortfolioService } from '../PortfolioService';
import { PortfolioServiceV1 } from '../portfolio/PortfolioServiceV1';
import { PortfolioServiceV2 } from '../portfolio/PortfolioServiceV2';
import { Portfolio } from '../PortfolioService';

jest.mock('../portfolio/PortfolioServiceV1');
jest.mock('../portfolio/PortfolioServiceV2');

describe('PortfolioService (Wrapper)', () => {
  let service: PortfolioService;
  let mockV1GetPortfolio: jest.Mock;
  let mockV2GetPortfolio: jest.Mock;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };

    mockV1GetPortfolio = jest.fn();
    mockV2GetPortfolio = jest.fn();

    (PortfolioServiceV1 as jest.Mock).mockImplementation(() => ({
      getPortfolio: mockV1GetPortfolio,
    }));
    (PortfolioServiceV2 as jest.Mock).mockImplementation(() => ({
      getPortfolio: mockV2GetPortfolio,
    }));

    service = new PortfolioService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });

  it('should delegate to V1 when flag is disabled', async () => {
    process.env.ENABLE_PORTFOLIO_SNAPSHOT = 'false';
    service = new PortfolioService(); // Re-initialize to pick up new env var

    const mockPortfolio: Portfolio = {
      totalValue: 1000,
      availableCash: 500,
      positions: [],
      positionsMap: new Map(),
    };
    mockV1GetPortfolio.mockResolvedValue(mockPortfolio);

    const result = await service.getPortfolio(1);

    expect(mockV1GetPortfolio).toHaveBeenCalledWith(1);
    expect(mockV2GetPortfolio).not.toHaveBeenCalled();
    expect(result).toEqual(mockPortfolio);
  });

  it('should delegate to V2 when flag is enabled', async () => {
    process.env.ENABLE_PORTFOLIO_SNAPSHOT = 'true';
    service = new PortfolioService(); // Re-initialize to pick up new env var

    const mockPortfolio: Portfolio = {
      totalValue: 2000,
      availableCash: 1000,
      positions: [],
      positionsMap: new Map(),
    };
    mockV2GetPortfolio.mockResolvedValue(mockPortfolio);

    const result = await service.getPortfolio(1);

    expect(mockV2GetPortfolio).toHaveBeenCalledWith(1);
    expect(mockV1GetPortfolio).not.toHaveBeenCalled();
    expect(result).toEqual(mockPortfolio);
  });

  it('should default to V1 when flag is not set', async () => {
    delete process.env.ENABLE_PORTFOLIO_SNAPSHOT;
    service = new PortfolioService(); // Re-initialize to pick up new env var

    const mockPortfolio: Portfolio = {
      totalValue: 1000,
      availableCash: 500,
      positions: [],
      positionsMap: new Map(),
    };
    mockV1GetPortfolio.mockResolvedValue(mockPortfolio);

    const result = await service.getPortfolio(1);

    expect(mockV1GetPortfolio).toHaveBeenCalledWith(1);
    expect(mockV2GetPortfolio).not.toHaveBeenCalled();
    expect(result).toEqual(mockPortfolio);
  });
});
