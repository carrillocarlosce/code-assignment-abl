import { render, screen } from '@testing-library/react';
import StockCard from '../StockCard';
import type { ChartPoint } from '../PriceChart';

const points: ChartPoint[] = [{ x: Date.now(), y: 123.45 }];

describe('StockCard', () => {
  it('renders pair and price and metrics', () => {
    render(
      <StockCard
        chartPoints={points}
        pair="AAPL/USD"
        price={123.45}
        decimals={2}
        prefix="$"
        hourlyAvg={120}
        lastUpdate={Date.now()}
      />,
    );

    expect(screen.getByText('AAPL/USD')).toBeInTheDocument();
    expect(screen.getByText('$123.45')).toBeInTheDocument();
    expect(screen.getByText('1h Avg:')).toBeInTheDocument();
    expect(screen.getByText(/\$ 120\.00/)).toBeInTheDocument();
    expect(screen.getByText('Last update:')).toBeInTheDocument();
  });
});
