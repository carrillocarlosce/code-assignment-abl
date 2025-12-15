import { render, screen } from '@testing-library/react';
import Dashboard from '../page';
import { PAIRS } from '../pairs';

// Avoid executing actual chart setup & Chart.js in tests
jest.mock('../../chartSetup', () => ({}));

jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="mock-line-chart" />,
}));

// Mock useWebSocket hook to avoid real socket connections
jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    status: 'connected',
    reconnectCount: 0,
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
  }),
}));

describe('Dashboard page', () => {
  it('renders dashboard title and connection status', () => {
    render(<Dashboard />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('renders all trading pair cards', () => {
    render(<Dashboard />);

    // Ensure all pairs are shown
    PAIRS.forEach((pair) => {
      expect(screen.getByText(pair.pair)).toBeInTheDocument();
    });
  });
});
