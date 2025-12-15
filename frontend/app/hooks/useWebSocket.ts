// hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { ConnectionStatus } from "../components/ConnectionStatus";
interface UseWebSocketOptions<T = never> {
  url: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (event: string, data: T) => void; // Generic message handler
}

export function useWebSocket<T>(options: UseWebSocketOptions<T>) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [reconnectCount, setReconnectCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  
  // Store callbacks in refs to avoid recreating connect callback
  const callbacksRef = useRef({
    onConnect: options.onConnect,
    onDisconnect: options.onDisconnect,
    onError: options.onError,
    onMessage: options.onMessage,
  });

  // Update callbacks ref when they change (without causing reconnection)
  useEffect(() => {
    callbacksRef.current = {
      onConnect: options.onConnect,
      onDisconnect: options.onDisconnect,
      onError: options.onError,
      onMessage: options.onMessage,
    };
  }, [options.onConnect, options.onDisconnect, options.onError, options.onMessage]);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(options.url, {
      reconnection: true,
      reconnectionAttempts: options.reconnectAttempts ?? 5,
      reconnectionDelay: options.reconnectDelay ?? 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      setStatus("connected");
      setReconnectCount(0);
      callbacksRef.current.onConnect?.();
    });

    socket.on("disconnect", () => {
      setStatus("disconnected");
      callbacksRef.current.onDisconnect?.();
    });

    socket.on("connect_error", (error) => {
      setStatus("disconnected");
      callbacksRef.current.onError?.(error);
    });

    socket.on("reconnect_attempt", () => {
      setStatus("connecting");
      setReconnectCount((prev) => prev + 1);
    });

    socket.on("reconnect", () => {
      setStatus("connected");
      setReconnectCount(0);
    });

    // Generic message handler - forwards all events to onMessage callback
    socket.onAny((event, ...args) => {
      callbacksRef.current.onMessage?.(event, args[0]);
    });

    socketRef.current = socket;
  }, [options.url, options.reconnectAttempts, options.reconnectDelay]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setStatus("disconnected");
  }, []);

  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  useEffect(() => {
    if (options.autoConnect !== false) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.url, options.autoConnect]); // Only reconnect if URL or autoConnect changes

  return {
    status,
    reconnectCount,
    connect,
    disconnect,
    emit,
  };
}
