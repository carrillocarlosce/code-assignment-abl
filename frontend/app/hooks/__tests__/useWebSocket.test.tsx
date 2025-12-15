import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';

// Simple in-memory socket mock
const handlers: Record<string, ((...args: any[]) => void)[]> = {};

const socketMock = {
  on: (event: string, cb: (...args: any[]) => void) => {
    handlers[event] = handlers[event] || [];
    handlers[event].push(cb);
  },
  onAny: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connected: false,
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => socketMock),
}));

const trigger = (event: string, ...args: any[]) => {
  (handlers[event] || []).forEach((cb) => cb(...args));
};

describe('useWebSocket', () => {
  beforeEach(() => {
    // reset handlers and mock calls
    for (const key of Object.keys(handlers)) delete handlers[key];
    (socketMock.emit as jest.Mock).mockClear();
    (socketMock.disconnect as jest.Mock).mockClear();
  });

  it('connects on mount and updates status to connected', () => {
    const onConnect = jest.fn();

    const { result } = renderHook(() =>
      useWebSocket<{ foo: string}>({
        url: 'http://localhost:8000',
        onConnect,
        autoConnect: true,
      }),
    );

    // Simulate socket "connect" event
    act(() => {
      trigger('connect');
    });

    expect(result.current.status).toBe('connected');
    expect(onConnect).toHaveBeenCalled();
  });

  it('sets status to disconnected on connect_error and calls onError', () => {
    const onError = jest.fn();

    const { result } = renderHook(() =>
      useWebSocket<{ foo: string}>({
        url: 'http://localhost:8000',
        onError,
        autoConnect: true,
      }),
    );

    const error = new Error('test error');

    act(() => {
      trigger('connect_error', error);
    });

    expect(result.current.status).toBe('disconnected');
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('updates reconnect count on reconnect_attempt', () => {
    const { result } = renderHook(() =>
      useWebSocket<{ foo: string}>({
        url: 'http://localhost:8000',
        autoConnect: true,
      }),
    );

    act(() => {
      trigger('reconnect_attempt');
    });

    expect(result.current.status).toBe('connecting');
    expect(result.current.reconnectCount).toBe(1);
  });

  it('exposes emit and disconnect functions', () => {
    const { result } = renderHook(() =>
      useWebSocket<{ foo: string}>({
        url: 'http://localhost:8000',
        autoConnect: true,
      }),
    );

    act(() => {
      result.current.emit('event', { foo: 'bar' });
      result.current.disconnect();
    });

    expect(socketMock.emit).toHaveBeenCalledWith('event', { foo: 'bar' });
    expect(socketMock.disconnect).toHaveBeenCalled();
  });
});
