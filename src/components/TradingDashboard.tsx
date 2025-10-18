"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { PriceTable } from "./PriceTable";
import { TradeExecution } from "./TradeExecution";
import { SystemMetrics } from "./SystemMetrics";
import { OrderBook } from "./OrderBook";
import { OrderHistory } from "./OrderHistory";
import { WebSocketProvider } from "@/lib/WebSocketProvider";

interface DashboardStats {
  totalVolume: number;
  activeTrades: number;
  systemLatency: number;
  errorRate: number;
}

export function TradingDashboard() {
  const [activeTab, setActiveTab] = useState<
    "prices" | "trading" | "metrics" | "orders"
  >("prices");
  const [stats, setStats] = useState<DashboardStats>({
    totalVolume: 0,
    activeTrades: 0,
    systemLatency: 0,
    errorRate: 0,
  });

  const [user, setUser] = useState<{ username: string; email: string } | null>(
    null
  );
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          window.location.href = "/login";
        }
      } catch (err) {
        console.error("User auth error:", err);
        window.location.href = "/login";
      } finally {
        setLoadingUser(false);
      }
    }

    checkAuth();
  }, []);

  useEffect(() => {
    // Fetch initial dashboard stats
    fetchDashboardStats();

    // Set up periodic refresh
    const interval = setInterval(fetchDashboardStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setStats({
        totalVolume: 1250000,
        activeTrades: 42,
        systemLatency: 0.8,
        errorRate: 0.02,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    }
  };

  const tabs = [
    { id: "prices", label: "Market Data", icon: TrendingUp },
    { id: "trading", label: "Trading", icon: DollarSign },
    { id: "metrics", label: "System Metrics", icon: Activity },
    { id: "orders", label: "Orders", icon: AlertTriangle },
  ] as const;

  return (
    <WebSocketProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        {/* Header */}
        <header className="bg-gray-900/80 backdrop-blur-sm shadow-lg border-b border-gray-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-white">
                  Trading Dashboard
                </h1>
                <div className="ml-4 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-400">Live</span>
                </div>
              </div>

              {user && (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-300">
                    Welcome, <strong>{user.username}</strong>
                  </span>
                  <button
                    onClick={async () => {
                      await fetch("/api/auth/logout", { method: "POST" });
                      window.location.href = "/";
                    }}
                    className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-lg text-sm"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-gray-700/50 hover:border-gray-600/50 transition">
              <div className="flex items-center">
                <div className="p-2 bg-gray-700 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">
                    Total Volume
                  </p>
                  <p className="text-2xl font-semibold text-white">
                    ${stats.totalVolume.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-gray-700/50 hover:border-gray-600/50 transition">
              <div className="flex items-center">
                <div className="p-2 bg-gray-700 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">
                    Active Trades
                  </p>
                  <p className="text-2xl font-semibold text-white">
                    {stats.activeTrades}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-gray-700/50 hover:border-gray-600/50 transition">
              <div className="flex items-center">
                <div className="p-2 bg-gray-700 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">
                    System Latency
                  </p>
                  <p className="text-2xl font-semibold text-white">
                    {stats.systemLatency}ms
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-gray-700/50 hover:border-gray-600/50 transition">
              <div className="flex items-center">
                <div className="p-2 bg-gray-700 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">
                    Error Rate
                  </p>
                  <p className="text-2xl font-semibold text-white">
                    {(stats.errorRate * 100).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/50">
            <div className="border-b border-gray-700/50">
              <nav className="-mb-px flex space-x-8 px-6">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition ${
                        activeTab === tab.id
                          ? "border-gray-400 text-white"
                          : "border-transparent text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === "prices" && <PriceTable />}
              {activeTab === "trading" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TradeExecution />
                  <OrderBook />
                </div>
              )}
              {activeTab === "metrics" && <SystemMetrics />}
              {activeTab === "orders" && <OrderHistory />}
            </div>
          </div>
        </div>
      </div>
    </WebSocketProvider>
  );
}
