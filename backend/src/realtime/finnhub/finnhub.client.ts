import { Injectable, Logger } from '@nestjs/common';
import WebSocket, { CloseEvent, ErrorEvent } from 'ws';

import type { FinnhubTradeMessage } from './finnhub.types';

@Injectable()
export class FinnhubClient {
  private readonly logger = new Logger(FinnhubClient.name);
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = Infinity; // Retry indefinitely
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 60000; // Max 60 seconds
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private subscribedSymbols: string[] = [];
  private isConnecting = false;
  private shouldReconnect = true;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastMessageTime: number = 0;
  private readonly heartbeatIntervalMs = 30000; // Check every 30 seconds
  private readonly maxSilenceMs = 60000; // Consider dead if no message for 60 seconds

  messageHandler: (msg: FinnhubTradeMessage) => void;
  onConnectHandler: () => void;

  constructor(private readonly apiKey: string) {
    if (!this.apiKey) {
      throw new Error('FINNHUB_API_KEY is required');
    }
  }

  connect() {
    if (
      this.isConnecting ||
      (this.ws && this.ws.readyState === WebSocket.OPEN)
    ) {
      this.logger.warn('Connection already in progress or established');
      return;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;

    try {
      this.logger.log('Connecting to Finnhub WebSocket...');
      this.ws = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`);

      this.ws.addEventListener('open', () => {
        this.logger.log('Successfully connected to Finnhub WebSocket');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000; // Reset delay on successful connection
        this.lastMessageTime = Date.now();
        this.startHeartbeat();
        this.onConnectHandler?.();
        // Re-subscribe to all symbols after reconnection
        if (this.subscribedSymbols.length > 0) {
          this.logger.log(
            `Re-subscribing to ${this.subscribedSymbols.length} symbols`,
          );
          this.subscribe(this.subscribedSymbols);
        }
      });

      this.ws.addEventListener('message', (event: WebSocket.MessageEvent) => {
        try {
          // Update last message time to track connection health
          this.lastMessageTime = Date.now();
          const msg = JSON.parse(event.data.toString()) as FinnhubTradeMessage;
          this.messageHandler?.(msg);
        } catch (error) {
          this.logger.error('Error parsing WebSocket message', error);
        }
      });

      this.ws.addEventListener('error', (error: ErrorEvent) => {
        this.logger.error('WebSocket error occurred', error);
        this.isConnecting = false;
        // Trigger reconnection on error if connection is not already closing
        if (this.shouldReconnect && (!this.ws || this.ws.readyState !== WebSocket.CLOSING)) {
          this.logger.warn('Connection error detected, will attempt to reconnect');
          this.handleDisconnection();
        }
      });

      this.ws.addEventListener('close', (event: CloseEvent) => {
        this.logger.warn(
          `WebSocket closed. Code: ${event.code}, Reason: ${event.reason.toString() || 'No reason provided'}`,
        );
        this.handleDisconnection();
      });
    } catch (error) {
      this.logger.error('Error creating WebSocket connection', error);
      this.isConnecting = false;
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  private handleDisconnection() {
    this.stopHeartbeat();
    this.isConnecting = false;
    this.ws = null;

    // Attempt to reconnect if we should
    if (this.shouldReconnect) {
      this.scheduleReconnect();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing heartbeat

    this.heartbeatInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private checkConnectionHealth() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return; // Already disconnected or connecting
    }

    const timeSinceLastMessage = Date.now() - this.lastMessageTime;
    const isStale = timeSinceLastMessage > this.maxSilenceMs;

    if (isStale) {
      this.logger.warn(
        `Connection appears stale (no messages for ${Math.round(timeSinceLastMessage / 1000)}s). Forcing reconnection.`,
      );
      // Force close to trigger reconnection
      try {
        this.ws.close();
      } catch (error) {
        this.logger.error('Error closing stale connection', error);
        // If we can't close gracefully, handle as disconnection
        this.handleDisconnection();
      }
    } else {
      // Try to ping the connection by checking if we can send
      try {
        // Check if connection is still alive by verifying readyState
        if (this.ws.readyState === WebSocket.OPEN) {
          // Connection appears healthy
          this.logger.debug(
            `Connection healthy (last message ${Math.round(timeSinceLastMessage / 1000)}s ago)`,
          );
        }
      } catch (error) {
        this.logger.error('Error checking connection health', error);
        this.handleDisconnection();
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      return; // Already scheduled
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(
        'Max reconnection attempts reached. Stopping reconnection.',
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay,
    );

    this.logger.log(
      `Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`,
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  subscribe(symbols: string[]) {
    // Store subscribed symbols for reconnection
    this.subscribedSymbols = [
      ...new Set([...this.subscribedSymbols, ...symbols]),
    ];

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.logger.warn(
        'Cannot subscribe: WebSocket is not connected. Symbols will be subscribed after connection.',
      );
      return;
    }

    symbols.forEach((symbol) => {
      try {
        this.logger.log(`Subscribing to ${symbol}`);
        this.ws!.send(JSON.stringify({ type: 'subscribe', symbol }));
      } catch (error) {
        this.logger.error(`Error subscribing to ${symbol}`, error);
      }
    });
  }

  unsubscribe(symbol: string) {
    // Remove from subscribed symbols
    this.subscribedSymbols = this.subscribedSymbols.filter((s) => s !== symbol);

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.logger.warn('Cannot unsubscribe: WebSocket is not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
    } catch (error) {
      this.logger.error(`Error unsubscribing from ${symbol}`, error);
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.logger.log('Disconnected from Finnhub WebSocket');
  }

  onMessage(handler: (msg: FinnhubTradeMessage) => void) {
    this.messageHandler = handler;
  }

  onConnect(handler: () => void) {
    this.onConnectHandler = handler;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
