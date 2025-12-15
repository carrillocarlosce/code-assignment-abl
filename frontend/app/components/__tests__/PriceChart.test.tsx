import { render } from '@testing-library/react';
import { PriceChart, type ChartPoint } from '../PriceChart';

jest.mock('react-chartjs-2', () => ({
  Line: (props: unknown) => {
    // simple mock component
    // eslint-disable-next-line jsx-a11y/aria-role
    return <div role="img" aria-label="mock-chart" data-props={JSON.stringify(props)} />;
  },
}));

const points: ChartPoint[] = [
  { x: Date.now(), y: 100 },
  { x: Date.now() + 1000, y: 105 },
];

describe('PriceChart', () => {
  it('renders without crashing with data', () => {
    const { getByLabelText } = render(
      <PriceChart points={points} decimals={2} prefix="$" />,
    );

    expect(getByLabelText('mock-chart')).toBeInTheDocument();
  });
});
