"use client";

import React, { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useWebSocket } from "@/lib/WebSocketProvider";

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  spreadPercent: number;
}

export function OrderBook() {
  const [orderBook, setOrderBook] = useState<OrderBookData>({
    bids: [],
    asks: [],
    spread: 0,
    spreadPercent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState("BTC/USD");
  const [changeMap, setChangeMap] = useState<
    Record<string, "up" | "down" | null>
  >({});
  const { lastMessage, sendMessage, isConnected } = useWebSocket();

  useEffect(() => {
    if (isConnected) {
      sendMessage({ type: "subscribe", symbol: selectedSymbol });
      console.log(`Subscribed to ${selectedSymbol}`);
    }
  }, [isConnected, selectedSymbol, sendMessage]);

  useEffect(() => {
    if (!lastMessage) return;
    if (
      lastMessage.type === "orderbook_update" &&
      Array.isArray(lastMessage.data)
    ) {
      const update = lastMessage.data.find(
        (d: any) => d.symbol === selectedSymbol
      );
      if (update) {
        setOrderBook((prev) => {
          const changes: Record<string, "up" | "down" | null> = {};
          if (prev.bids.length > 0 && update?.bids) {
            update.bids.forEach((b: any, i: number) => {
              if (prev.bids[i] && prev.bids[i].price !== b.price) {
                changes[`bid-${i}`] =
                  b.price > prev.bids[i].price ? "up" : "down";
              }
            });
          }
          if (prev.asks.length > 0 && update?.asks) {
            update.asks.forEach((a: any, i: number) => {
              if (prev.asks[i] && prev.asks[i].price !== a.price) {
                changes[`ask-${i}`] =
                  a.price > prev.asks[i].price ? "up" : "down";
              }
            });
          }

          setChangeMap(changes);
          setTimeout(() => setChangeMap({}), 800);

          return {
            bids: update.bids,
            asks: update.asks,
            spread: update.spread,
            spreadPercent: update.spreadPercent,
          };
        });
        setLoading(false);
      }
    }
  }, [lastMessage, selectedSymbol]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(price);

  const formatAmount = (amount?: number) =>
    typeof amount === "number" && !isNaN(amount) ? amount.toFixed(4) : "0.0000";

  const getIntensity = (total: number, maxTotal: number) =>
    Math.min((total / maxTotal) * 100, 100);

  const maxBidTotal = Math.max(...orderBook.bids.map((b) => b.total), 0);
  const maxAskTotal = Math.max(...orderBook.asks.map((a) => a.total), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Order Book</h3>
        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
          className="px-3 py-1 border border-gray-600/50 rounded-md bg-gray-700/50 text-white text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
        >
          <option value="BTC/USD">BTC/USD</option>
          <option value="ETH/USD">ETH/USD</option>
          <option value="ADA/USD">ADA/USD</option>
          <option value="SOL/USD">SOL/USD</option>
          <option value="DOT/USD">DOT/USD</option>
        </select>
      </div>

      {/* Spread Information */}
      <div className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-3 border border-gray-600/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Spread:</span>
          <span className="font-medium text-white">
            {formatPrice(orderBook.spread)} (
            {orderBook.spreadPercent.toFixed(3)}%)
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">
          Loading order book...
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header */}
          <div className="grid grid-cols-3 gap-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
            <div className="text-right">Price</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Total</div>
          </div>

          {/* Asks (Sell Orders) */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-red-400 flex items-center space-x-1">
              <TrendingUp className="w-4 h-4" />
              <span>Asks</span>
            </div>
            {orderBook.asks?.slice(0, 10).map((ask, index) => (
              <div
                key={`ask-${index}`}
                className="grid grid-cols-3 gap-4 text-sm relative group hover:bg-gray-700/30 rounded px-2 py-1 transition"
              >
                <div
                  className="absolute left-0 top-0 h-full bg-red-900/30 rounded transition-all duration-700 ease-in-out"
                  style={{ width: `${getIntensity(ask.total, maxAskTotal)}%` }}
                />
                <div className="text-red-400 text-right relative z-10">
                  {formatPrice(ask.price)}
                </div>
                <div className="text-white text-right relative z-10">
                  {formatAmount(ask.amount)}
                </div>
                <div className="text-gray-400 text-right relative z-10">
                  {formatAmount(ask.total)}
                </div>
              </div>
            ))}
          </div>

          {/* Bids (Buy Orders) */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-green-400 flex items-center space-x-1">
              <TrendingDown className="w-4 h-4" />
              <span>Bids</span>
            </div>
            {orderBook.bids?.slice(0, 10).map((bid, index) => (
              <div
                key={`bid-${index}`}
                className="grid grid-cols-3 gap-4 text-sm relative group hover:bg-gray-700/30 rounded px-2 py-1 transition"
              >
                <div
                  className="absolute left-0 top-0 h-full bg-green-900/20 rounded transition-[width] duration-500 ease-out"
                  style={{ width: `${getIntensity(bid.total, maxBidTotal)}%` }}
                />
                <div className="text-green-400 text-right relative z-10">
                  {formatPrice(bid.price)}
                </div>
                <div className="text-white text-right relative z-10">
                  {formatAmount(bid.amount)}
                </div>
                <div className="text-gray-400 text-right relative z-10">
                  {formatAmount(bid.total)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Book Stats */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-3 border border-gray-600/50">
          <div className="text-gray-400">Best Bid</div>
          <div className="text-lg font-semibold text-green-400">
            {orderBook.bids[0] ? formatPrice(orderBook.bids[0].price) : "N/A"}
          </div>
        </div>
        <div className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-3 border border-gray-600/50">
          <div className="text-gray-400">Best Ask</div>
          <div className="text-lg font-semibold text-red-400">
            {orderBook.asks[0] ? formatPrice(orderBook.asks[0].price) : "N/A"}
          </div>
        </div>
      </div>
    </div>
  );
}
