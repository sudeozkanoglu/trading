'use client';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { Mail, Lock, User, Globe } from 'lucide-react';

export default function UserAuthForm() {
  const route = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    country: '',
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      if (mode === 'register') {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        setMessage(res.ok ? 'Registration successful!' : ` ${data.error}`);
      } else {
        const params = new URLSearchParams({
          email: form.email,
          password: form.password,
        });
        const res = await fetch(`/api/users?${params}`);
        const data = await res.json();
        setMessage(res.ok ? `Login successful, welcome ${data.user.username}` : ` ${data.error}`);
        if (res.ok) {
          route.push('/home');
        }
      }
    } catch (err) {
      setMessage('Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-20 right-10 w-72 h-72 bg-gray-700 rounded-full mix-blend-screen filter blur-3xl opacity-10"></div>
      <div className="absolute bottom-20 left-10 w-72 h-72 bg-gray-600 rounded-full mix-blend-screen filter blur-3xl opacity-10" style={{animationDelay: '2s'}}></div>

      <div className="relative w-full max-w-md bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-gray-700 z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            {mode === 'register' ? 'Welcome' : 'Go Back'}
          </h1>
          <p className="text-gray-400 text-sm">
            {mode === 'register'
              ? 'Create a new account and get started'
              : 'Log in to your account'}
          </p>
        </div>

        <div onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="relative">
              <div className="absolute left-3 top-3 text-gray-500">
                <User size={20} />
              </div>
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={form.username}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition"
              />
            </div>
          )}

          <div className="relative">
            <div className="absolute left-3 top-3 text-gray-500">
              <Mail size={20} />
            </div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition"
            />
          </div>

          <div className="relative">
            <div className="absolute left-3 top-3 text-gray-500">
              <Lock size={20} />
            </div>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition"
            />
          </div>

          {mode === 'register' && (
            <div className="relative">
              <div className="absolute left-3 top-3 text-gray-500">
                <Globe size={20} />
              </div>
              <input
                type="text"
                name="country"
                placeholder="Country (optional)"
                value={form.country}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition"
              />
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 mt-6 rounded-lg bg-gradient-to-r from-gray-700 to-gray-600 text-white font-semibold hover:from-gray-600 hover:to-gray-500 transition transform hover:scale-105 disabled:opacity-50 disabled:scale-100 border border-gray-500"
          >
            {loading
              ? 'Sending...'
              : mode === 'register'
              ? 'Register'
              : 'Login'}
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-center text-sm font-medium transition animate-in ${
              message.startsWith('✅')
                ? 'bg-gray-700 text-green-300 border border-gray-600'
                : 'bg-gray-700 text-red-300 border border-gray-600'
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm mb-3">
            {mode === 'register'
              ? 'Already have an account?'
              : 'Don’t have an account?'}
          </p>
          <button
            type="button"
            onClick={() =>
              setMode(mode === 'register' ? 'login' : 'register')
            }
            className="text-gray-300 hover:text-white font-semibold text-sm transition duration-200"
          >
            {mode === 'register'
              ? 'Login'
              : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
}