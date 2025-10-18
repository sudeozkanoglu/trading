'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useWebSocket } from '@/lib/WebSocketProvider';

interface SystemMetric {
  metric_name: string;
  metric_value: number;
  timestamp: string;
  component: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

interface AggregatedMetric {
  component: string;
  metric_name: string;
  avg_value: number;
  max_value: number;
  min_value: number;
  data_points: number;
  max_severity: string;
}

interface Alert {
  component: string;
  metric_name: string;
  metric_value: number;
  timestamp: string;
  severity: 'error' | 'critical';
}

export function SystemMetrics() {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedMetric[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('1h');
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);

  const { lastMessage } = useWebSocket();


useEffect(() => {
  if (lastMessage?.type === "metrics" && Array.isArray(lastMessage.data)) {
    setMetrics((prev) => {
      const updated = [...lastMessage.data, ...prev];
      const unique = Array.from(
        new Map(
          updated.map((m) => [`${m.timestamp}-${m.component}-${m.metric_name}`, m])
        ).values()
      );
      return unique
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 100);
    });
  }
}, [lastMessage]);

useEffect(() => {
  fetchAggregatedMetrics();
  const interval = setInterval(fetchAggregatedMetrics, 30000);
  return () => clearInterval(interval);
}, [timeRange, selectedComponents]);

  const fetchAggregatedMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeRange,
          components: selectedComponents,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setAggregated(data.aggregated);
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Error fetching aggregated metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400 bg-red-900/40';
      case 'error':
        return 'text-red-400 bg-red-900/40';
      case 'warning':
        return 'text-yellow-400 bg-yellow-900/40';
      default:
        return 'text-green-400 bg-green-900/40';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return <XCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  // Prepare chart data
  const chartData = metrics
    .filter(metric => metric.metric_name === 'latency_ms')
    .slice(-20)
    .map(metric => ({
      time: new Date(metric.timestamp).toLocaleTimeString(),
      latency: metric.metric_value,
      component: metric.component,
    }));

  const throughputData = metrics
    .filter(metric => metric.metric_name === 'throughput_ops')
    .slice(-20)
    .map(metric => ({
      time: new Date(metric.timestamp).toLocaleTimeString(),
      throughput: metric.metric_value,
      component: metric.component,
    }));

  const components = ['websocket', 'database', 'api', 'fpga', 'order_engine'];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Time Range
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '1h' | '24h' | '7d')}
            className="px-3 py-2 border border-gray-600/50 rounded-md bg-gray-700/50 text-white focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Components
          </label>
          <div className="flex flex-wrap gap-2">
            {components.map(component => (
              <label key={component} className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={selectedComponents.includes(component)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedComponents(prev => [...prev, component]);
                    } else {
                      setSelectedComponents(prev => prev.filter(c => c !== component));
                    }
                  }}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">{component}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-medium text-red-300">
              Critical Alerts
            </h3>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-red-900/40 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-red-300">
                    {alert.component}
                  </span>
                  <span className="text-sm text-red-400">
                    {alert.metric_name}: {alert.metric_value.toFixed(2)}
                  </span>
                </div>
                <span className="text-xs text-red-400">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Chart */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-gray-700/50">
          <h3 className="text-lg font-medium text-white mb-4">
            System Latency
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#F3F4F6'
                }}
              />
              <Line
                type="monotone"
                dataKey="latency"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Throughput Chart */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-gray-700/50">
          <h3 className="text-lg font-medium text-white mb-4">
            Throughput
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={throughputData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#F3F4F6'
                }}
              />
              <Bar dataKey="throughput" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Aggregated Metrics Table */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/50">
        <div className="px-6 py-4 border-b border-gray-700/50">
          <h3 className="text-lg font-medium text-white">
            Component Metrics
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700/50">
            <thead className="bg-gray-700/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Component
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Metric
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Average
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Max
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Min
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800/30 divide-y divide-gray-700/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : aggregated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                    No data available
                  </td>
                </tr>
              ) : (
                aggregated.map((metric, index) => (
                  <tr key={index} className="hover:bg-gray-700/30 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {metric.component}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {metric.metric_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {metric.avg_value.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {metric.max_value.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {metric.min_value.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(metric.max_severity)}`}>
                        {getSeverityIcon(metric.max_severity)}
                        <span className="ml-1 capitalize">{metric.max_severity}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}