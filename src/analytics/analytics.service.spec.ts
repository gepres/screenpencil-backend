import { AnalyticsService } from './analytics.service';
import { AnalyticsPeriod } from './dto/period-query.dto';
import type { ProviderSummary } from './analytics.types';

// Dobles de prueba: Prisma y los dos clientes externos.
const makePrismaMock = () => ({
  metricSnapshot: {
    findFirst: jest.fn(),
    create: jest.fn().mockResolvedValue({}),
  },
});

const sampleProvider: ProviderSummary = {
  totals: { pageviews: 100, visits: 70 },
  topPages: [{ path: '/', views: 80 }],
  countries: [{ code: 'PE', views: 50 }],
  referrers: [{ host: 'google.com', views: 20 }],
};

describe('AnalyticsService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let goatcounter: { getSummary: jest.Mock };
  let cloudflare: { getSummary: jest.Mock };
  let service: AnalyticsService;

  beforeEach(() => {
    prisma = makePrismaMock();
    goatcounter = { getSummary: jest.fn() };
    cloudflare = { getSummary: jest.fn() };
    service = new AnalyticsService(
      prisma as never,
      goatcounter as never,
      cloudflare as never,
    );
  });

  it('marca partial=true cuando ambas fuentes devuelven null', async () => {
    prisma.metricSnapshot.findFirst.mockResolvedValue(null);
    goatcounter.getSummary.mockResolvedValue(null);
    cloudflare.getSummary.mockResolvedValue(null);

    const result = await service.getSummary(AnalyticsPeriod.Week);

    expect(result.partial).toBe(true);
    expect(result.goatcounter).toBeNull();
    expect(result.cloudflare).toBeNull();
    expect(prisma.metricSnapshot.create).toHaveBeenCalledTimes(1);
  });

  it('marca partial=false cuando ambas fuentes responden', async () => {
    prisma.metricSnapshot.findFirst.mockResolvedValue(null);
    goatcounter.getSummary.mockResolvedValue(sampleProvider);
    cloudflare.getSummary.mockResolvedValue(sampleProvider);

    const result = await service.getSummary(AnalyticsPeriod.Month);

    expect(result.partial).toBe(false);
    expect(result.goatcounter).toEqual(sampleProvider);
    expect(result.cloudflare).toEqual(sampleProvider);
  });

  it('devuelve el snapshot cacheado y NO consulta las fuentes si está fresco', async () => {
    const cachedPayload = { period: '7d', partial: false, cached: true };
    prisma.metricSnapshot.findFirst.mockResolvedValue({
      createdAt: new Date(), // recién creado => dentro del TTL
      payload: cachedPayload,
    });

    const result = await service.getSummary(AnalyticsPeriod.Week);

    expect(result).toEqual(cachedPayload);
    expect(goatcounter.getSummary).not.toHaveBeenCalled();
    expect(cloudflare.getSummary).not.toHaveBeenCalled();
    expect(prisma.metricSnapshot.create).not.toHaveBeenCalled();
  });

  it('ignora el snapshot vencido y vuelve a consultar las fuentes', async () => {
    prisma.metricSnapshot.findFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 60 * 60 * 1000), // hace 1 hora => vencido (TTL 10 min)
      payload: { stale: true },
    });
    goatcounter.getSummary.mockResolvedValue(sampleProvider);
    cloudflare.getSummary.mockResolvedValue(sampleProvider);

    const result = await service.getSummary(AnalyticsPeriod.Week);

    expect(goatcounter.getSummary).toHaveBeenCalledTimes(1);
    expect(result.partial).toBe(false);
  });
});
