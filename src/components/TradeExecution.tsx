"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, AlertCircle } from "lucide-react";
import { useWebSocket } from "@/lib/WebSocketProvider";

interface TradeForm {
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop";
  amount: number;
  price?: number;
  stopPrice?: number;
}

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

export function TradeExecution() {
  const [form, setForm] = useState<TradeForm>({
    symbol: "BTC/USD",
    side: "buy",
    type: "market",
    amount: 0,
    price: 0,
    stopPrice: 0,
  });
  const [loading, setLoading] = useState(false);
  const [orderBook, setOrderBook] = useState<{
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
  }>({ bids: [], asks: [] });
  const [currentPrice, setCurrentPrice] = useState(0);

  const { sendMessage, lastMessage, isConnected } = useWebSocket();

  useEffect(() => {
    if (isConnected) {
      sendMessage({ type: "subscribe", symbol: form.symbol });
      console.log(` Subscribed to ${form.symbol}`);
    }
  }, [isConnected, form.symbol, sendMessage]);

  useEffect(() => {
    if (lastMessage?.type === "prices" && Array.isArray(lastMessage.data)) {
      const latest = lastMessage.data[0];
      if (latest?.symbol === form.symbol && latest?.price) {
        setCurrentPrice(latest.price);
        updateOrderBook(latest.price);
      }
    }
  }, [lastMessage, form.symbol]);

  const updateOrderBook = (basePrice: number) => {
    const bids = Array.from({ length: 10 }, (_, i) => ({
      price: parseFloat((basePrice * (1 - i * 0.0005)).toFixed(2)),
      amount: Math.random() * 10,
      total: 0,
    }));

    const asks = Array.from({ length: 10 }, (_, i) => ({
      price: parseFloat((basePrice * (1 + i * 0.0005)).toFixed(2)),
      amount: Math.random() * 10,
      total: 0,
    }));

    let bidTotal = 0;
    bids.forEach((b) => {
      bidTotal += b.amount;
      b.total = bidTotal;
    });

    let askTotal = 0;
    asks.forEach((a) => {
      askTotal += a.amount;
      a.total = askTotal;
    });

    setOrderBook({ bids, asks });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderData = {
        symbol: form.symbol,
        side: form.side,
        type: form.type,
        amount: form.amount,
        price: form.type === "market" ? undefined : form.price,
        stop_price: form.type === "stop" ? form.stopPrice : undefined,
        exchange: "binance",
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      const result = await res.json();
      if (res.ok) {
        alert(`Order placed successfully: ${result.order.symbol}`);
        setForm((prev) => ({ ...prev, amount: 0, price: 0, stopPrice: 0 }));
      } else {
        alert(`Order failed: ${result.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error placing order:", err);
      alert("Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof TradeForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Trade Execution</h3>

        {/* Current Price Display */}
        <div className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-4 mb-4 border border-gray-600/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {form.symbol} Current Price
            </span>
            <span className="text-2xl font-bold text-white">
              {currentPrice ? formatPrice(currentPrice) : "Loading..."}
            </span>
          </div>
        </div>

        {/* Trade Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Symbol
              </label>
              <select
                value={form.symbol}
                onChange={(e) => handleInputChange("symbol", e.target.value)}
                className="w-full px-3 py-2 border border-gray-600/50 rounded-md bg-gray-700/50 text-white focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
              >
                <option value="BTC/USD">BTC/USD</option>
                <option value="ETH/USD">ETH/USD</option>
                <option value="ADA/USD">ADA/USD</option>
                <option value="SOL/USD">SOL/USD</option>
                <option value="DOT/USD">DOT/USD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Side
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleInputChange("side", "buy")}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition ${
                    form.side === "buy"
                      ? "bg-green-600 text-white"
                      : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  Buy
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange("side", "sell")}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition ${
                    form.side === "sell"
                      ? "bg-red-600 text-white"
                      : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  Sell
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Order Type
            </label>
            <select
              value={form.type}
              onChange={(e) => handleInputChange("type", e.target.value)}
              className="w-full px-3 py-2 border border-gray-600/50 rounded-md bg-gray-700/50 text-white focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
            >
              <option value="market">Market</option>
              <option value="limit">Limit</option>
              <option value="stop">Stop</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Amount
            </label>
            <input
              type="number"
              step="0.00000001"
              value={form.amount}
              onChange={(e) =>
                handleInputChange("amount", parseFloat(e.target.value) || 0)
              }
              className="w-full px-3 py-2 border border-gray-600/50 rounded-md bg-gray-700/50 text-white focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
              placeholder="0.00000000"
              required
            />
          </div>

          {form.type === "limit" && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Limit Price
              </label>
              <input
                type="number"
                step="0.01"
                value={form.price || ""}
                onChange={(e) =>
                  handleInputChange("price", parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-gray-600/50 rounded-md bg-gray-700/50 text-white focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                placeholder="0.00"
                required
              />
            </div>
          )}

          {form.type === "stop" && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Stop Price
              </label>
              <input
                type="number"
                step="0.01"
                value={form.stopPrice || ""}
                onChange={(e) =>
                  handleInputChange(
                    "stopPrice",
                    parseFloat(e.target.value) || 0
                  )
                }
                className="w-full px-3 py-2 border border-gray-600/50 rounded-md bg-gray-700/50 text-white focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                placeholder="0.00"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || form.amount <= 0}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition shadow-lg hover:shadow-blue-600/50"
          >
            {loading ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Placing Order...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Place {form.side.toUpperCase()} Order</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Order Book Preview */}
      <div className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-4 border border-gray-600/50">
        <h4 className="text-md font-medium text-white mb-3">
          Order Book - {form.symbol}
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {/* Bids */}
          <div>
            <div className="text-sm font-medium text-green-400 mb-2">Bids</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {orderBook.bids.slice(0, 5).map((bid, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-green-400">
                    {formatPrice(bid.price)}
                  </span>
                  <span className="text-gray-400">{bid.amount.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Asks */}
          <div>
            <div className="text-sm font-medium text-red-400 mb-2">Asks</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {orderBook.asks.slice(0, 5).map((ask, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-red-400">{formatPrice(ask.price)}</span>
                  <span className="text-gray-400">{ask.amount.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
