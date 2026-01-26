import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Gamepad2, User, Lock, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../store/authStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ThemeToggle from '../components/ui/ThemeToggle';

const LoginPage: React.FC = () => {
  const { user, login, isLoading, error } = useAuthStore();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // If user is already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300 dark:from-dark-300 dark:to-dark-500 px-4 sm:px-6 lg:px-8">
      {/* Theme Toggle - Positioned in top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle variant="full" />
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-dark-200 rounded-lg shadow-xl overflow-hidden border border-gray-200 dark:border-dark-100">
          {/* Header */}
          <div className="p-6 sm:p-8 bg-gray-50 dark:bg-dark-300">
            <div className="flex justify-center mb-6">
              <Gamepad2 className="h-12 w-12 text-primary-500 dark:text-accent-500 animate-pulse-slow" />
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
              Gaming Tournaments
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400">
              Admin Dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="p-3 bg-error-50 dark:bg-error-900/30 text-error-700 dark:text-error-300 rounded-md text-sm border border-error-200 dark:border-error-800">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                leftIcon={<User className="h-5 w-5 text-gray-400" />}
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  leftIcon={<Lock className="h-5 w-5 text-gray-400" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  }
                />
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
              variant="primary"
              size="lg"
              className="font-semibold"
            >
              Administrator Login
            </Button>

            <div className="text-center text-xs text-gray-500 dark:text-gray-400">
              Gaming Tournament Management System
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
