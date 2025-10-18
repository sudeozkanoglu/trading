'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface TradingPrice {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  exchange: string;
  bid: number;
  ask: number;
  high_24h: number;
  low_24h: number;
  change_24h: number;
  change_percent_24h: number;
}

interface SystemMetric {
  metric_name: string;
  metric_value: number;
  timestamp: Date;
  component: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: Date;
  exchange: string;
  user_id: string;
  order_id: string;
}

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000,
  } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<TradingPrice[]>([]);
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  
  const reconnectCount = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (socket?.connected) return;

    const newSocket = io('ws://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      setError(null);
      reconnectCount.current = 0;
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('WebSocket disconnected:', reason);
      setConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        if (reconnectCount.current < reconnectAttempts) {
          reconnectCount.current++;
          console.log(`🔄 Attempting to reconnect (${reconnectCount.current}/${reconnectAttempts})`);
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, reconnectDelay * reconnectCount.current);
        } else {
          setError('Failed to reconnect to server');
        }
      }
    });

    newSocket.on('connect_error', (err: Error) => {
      console.error('📡 WebSocket connection error:', err);
      setError(err.message);
      setConnected(false);
    });

    // Price updates
    newSocket.on('price_update', (data: TradingPrice[]) => {
      setPrices(data);
    });

    // System metrics updates
    newSocket.on('metrics_update', (data: SystemMetric[]) => {
      setMetrics(data);
    });

    // Trade executions
    newSocket.on('trade_executed', (trade: Trade) => {
      setTrades(prev => [trade, ...prev.slice(0, 99)]); // Keep last 100 trades
    });

    // Order updates
    newSocket.on('order_placed', (order: any) => {
      console.log('Order placed:', order);
    });

    setSocket(newSocket);
  }, [reconnectAttempts, reconnectDelay]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }
  }, [socket]);

  const subscribeToSymbols = useCallback((symbols: string[]) => {
    if (socket?.connected) {
      socket.emit('subscribe_symbols', symbols);
    }
  }, [socket]);

  const subscribeToMetrics = useCallback((components: string[]) => {
    if (socket?.connected) {
      socket.emit('subscribe_metrics', components);
    }
  }, [socket]);

  const executeTrade = useCallback((tradeData: Omit<Trade, 'id' | 'timestamp'>) => {
    return new Promise((resolve, reject) => {
      if (!socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Trade execution timeout'));
      }, 10000);

      socket.emit('execute_trade', tradeData);
      
      socket.once('trade_confirmation', (response: { success: boolean; tradeId?: string; error?: string }) => {
        clearTimeout(timeout);
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Trade execution failed'));
        }
      });
    });
  }, [socket]);

  const placeOrder = useCallback((orderData: any) => {
    return new Promise((resolve, reject) => {
      if (!socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Order placement timeout'));
      }, 10000);

      socket.emit('place_order', orderData);
      
      socket.once('order_confirmation', (response: { success: boolean; orderId?: string; error?: string }) => {
        clearTimeout(timeout);
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Order placement failed'));
        }
      });
    });
  }, [socket]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connected,
    error,
    prices,
    metrics,
    trades,
    connect,
    disconnect,
    subscribeToSymbols,
    subscribeToMetrics,
    executeTrade,
    placeOrder,
  };
}
