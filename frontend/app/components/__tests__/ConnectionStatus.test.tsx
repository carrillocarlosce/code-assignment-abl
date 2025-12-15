import { render, screen } from '@testing-library/react';
import ConnectionStatus from '../ConnectionStatus';

describe('ConnectionStatus', () => {
  it('shows Connected state', () => {
    render(<ConnectionStatus status="connected" />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('shows Connecting state', () => {
    render(<ConnectionStatus status="connecting" />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('shows Disconnected state', () => {
    render(<ConnectionStatus status="disconnected" />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });
});
