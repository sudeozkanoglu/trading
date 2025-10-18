"use client";

import React, { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, RefreshCw } from "lucide-react";
import { useWebSocket } from "@/lib/WebSocketProvider";

interface PriceData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: string;
  exchange: string;
  bid: number;
  ask: number;
  high_24h: number;
  low_24h: number;
  change_24h: number;
  change_percent_24h: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function PriceTable() {
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [selectedExchange, setSelectedExchange] = useState<string>("");
  const [priceChange, setPriceChange] = useState<
    Record<string, "up" | "down" | null>
  >({});

  useEffect(() => {
    // sadece ilk yüklemede ClickHouse’tan datayı çek
    fetchPrices();
  }, []);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3001");
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "prices") {
        setPrices((prevPrices) => {
          let updated = message.data;
          if (selectedSymbol) {
            updated = updated.filter((p: any) => p.symbol === selectedSymbol);
          }
          if (selectedExchange) {
            updated = updated.filter(
              (p: any) => p.exchange === selectedExchange
            );
          }

          // Fiyat değişim yönlerini bul
          const changes: Record<string, "up" | "down" | null> = {};
          updated.forEach((newPrice: any) => {
            const old = prevPrices.find(
              (p) =>
                p.symbol === newPrice.symbol && p.exchange === newPrice.exchange
            );
            if (old) {
              if (newPrice.price > old.price) changes[newPrice.symbol] = "up";
              else if (newPrice.price < old.price)
                changes[newPrice.symbol] = "down";
              else changes[newPrice.symbol] = null;
            } else {
              changes[newPrice.symbol] = null;
            }
          });

          setPriceChange(changes);
          setTimeout(() => {
            setPriceChange({});
          }, 1000);

          return updated;
        });
      }
    };

    ws.onclose = () => console.log("WebSocket closed");
    ws.onerror = (err) => console.error("WebSocket error", err);

    return () => {
      ws.close();
    };
  }, []);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (selectedSymbol) params.append("symbol", selectedSymbol);
      if (selectedExchange) params.append("exchange", selectedExchange);

      const response = await fetch(`/api/prices?${params}`);
      const data = await response.json();

      if (response.ok) {
        setPrices(data.data);
        setPagination(data.pagination);
      } else {
        console.error("Failed to fetch prices:", data.error);
      }
    } catch (error) {
      console.error("Error fetching prices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(price);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)}K`;
    }
    return volume.toString();
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-400";
    if (change < 0) return "text-red-400";
    return "text-gray-400";
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ChevronUp className="w-4 h-4" />;
    if (change < 0) return <ChevronDown className="w-4 h-4" />;
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Symbol
          </label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="px-3 py-2 border border-gray-600 rounded-md bg-gray-700/50 text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition"
          >
            <option value="">All Symbols</option>
            <option value="BTC/USD">BTC/USD</option>
            <option value="ETH/USD">ETH/USD</option>
            <option value="ADA/USD">ADA/USD</option>
            <option value="SOL/USD">SOL/USD</option>
            <option value="DOT/USD">DOT/USD</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Exchange
          </label>
          <select
            value={selectedExchange}
            onChange={(e) => setSelectedExchange(e.target.value)}
            className="px-3 py-2 border border-gray-600 rounded-md bg-gray-700/50 text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition"
          >
            <option value="">All Exchanges</option>
            <option value="binance">Binance</option>
            <option value="coinbase">Coinbase</option>
            <option value="kraken">Kraken</option>
            <option value="bitfinex">Bitfinex</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Page Size
          </label>
          <select
            value={pagination.limit}
            onChange={(e) => handleLimitChange(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-600 rounded-md bg-gray-700/50 text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <button
          onClick={fetchPrices}
          disabled={loading}
          className="mt-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md disabled:opacity-50 flex items-center space-x-2 transition border border-gray-600"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-700/50 rounded-lg">
        <table className="min-w-full divide-y divide-gray-700/50">
          <thead className="bg-gray-800/50 border-b border-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Symbol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Change 24h
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Volume
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Bid/Ask
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                High/Low 24h
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Exchange
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800/30 divide-y divide-gray-700/50">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : prices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              prices.map((price, index) => (
                <tr
                  key={`${price.symbol}-${price.exchange}-${index}`}
                  className={`
    hover:bg-gray-700/30 transition 
    ${
      priceChange[price.symbol] === "up"
        ? "bg-green-500/20 animate-flash-green"
        : ""
    }
    ${
      priceChange[price.symbol] === "down"
        ? "bg-red-500/20 animate-flash-red"
        : ""
    }
  `}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">
                      {price.symbol}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">
                      {formatPrice(price.price)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`text-sm flex items-center space-x-1 ${getChangeColor(
                        price.change_percent_24h
                      )}`}
                    >
                      {getChangeIcon(price.change_percent_24h)}
                      <span>{(price.change_percent_24h ?? 0).toFixed(2)}%</span>
                    </div>
                    <div
                      className={`text-xs ${getChangeColor(price.change_24h)}`}
                    >
                      {formatPrice(price.change_24h)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatVolume(price.volume)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <div>{formatPrice(price.bid)}</div>
                    <div className="text-gray-500">
                      {formatPrice(price.ask)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <div>{formatPrice(price.high_24h)}</div>
                    <div className="text-gray-500">
                      {formatPrice(price.low_24h)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {price.exchange}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
          {pagination.total} results
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!pagination.hasPrev}
            className="px-3 py-2 text-sm font-medium text-gray-400 bg-gray-700/50 border border-gray-600 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Previous
          </button>
          <span className="px-3 py-2 text-sm text-gray-300">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!pagination.hasNext}
            className="px-3 py-2 text-sm font-medium text-gray-400 bg-gray-700/50 border border-gray-600 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
