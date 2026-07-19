import { prisma } from "./db";
import { extractFeatures } from "./valuation/features";
import { predict } from "./valuation/model";

export interface BacktestResult {
  points: { actual: number; predicted: number; domain: string }[];
  count: number;
  medianAbsPctError: number;
  within2x: number; // share of predictions within 0.5x–2x of actual
  correlation: number;
}

/**
 * Backtest the model against a sample of the seeded sales: predict each
 * domain's value from features alone and compare to the realized price.
 */
export async function runBacktest(sampleSize = 300): Promise<BacktestResult> {
  const total = await prisma.sale.count();
  const take = Math.min(sampleSize, total);
  // Evenly stride through the table for a representative sample.
  const stride = Math.max(1, Math.floor(total / take));
  const sales = await prisma.sale.findMany({
    take,
    skip: 0,
    orderBy: { soldAt: "asc" },
  });
  const sampled = sales.filter((_, i) => i % stride === 0).slice(0, take);

  const points: BacktestResult["points"] = [];
  const pctErrors: number[] = [];
  let within2xCount = 0;

  for (const sale of sampled) {
    const features = await extractFeatures(sale.domain);
    const prediction = predict(features);
    points.push({ actual: sale.price, predicted: prediction.mid, domain: sale.domain });

    const pctError = Math.abs(prediction.mid - sale.price) / sale.price;
    pctErrors.push(pctError);
    const ratio = prediction.mid / sale.price;
    if (ratio >= 0.5 && ratio <= 2) within2xCount++;
  }

  pctErrors.sort((a, b) => a - b);
  const medianAbsPctError = pctErrors.length ? pctErrors[Math.floor(pctErrors.length / 2)] : 0;

  return {
    points,
    count: points.length,
    medianAbsPctError,
    within2x: points.length ? within2xCount / points.length : 0,
    correlation: correlation(points.map((p) => Math.log(p.actual)), points.map((p) => Math.log(p.predicted))),
  };
}

function correlation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (!n) return 0;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}
