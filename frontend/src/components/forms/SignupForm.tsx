// src/components/forms/SignupForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { calculatePasswordStrength } from '@/lib/utils';
import api from '@/lib/axios';

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  signupPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  signupPassword?: string;
  general?: string;
}

export function SignupForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    signupPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.signupPassword) {
      newErrors.signupPassword = 'Signup code is required';
    }

    const { score: passwordStrength } = calculatePasswordStrength(formData.password);
    if (passwordStrength < 50) {
      newErrors.password = 'Please choose a stronger password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      await api.post('/api/auth/signup', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        signup_password: formData.signupPassword,
      });
      router.push('/auth/login?signup=success');
    } catch (err: any) {
      const serverError = err.response?.data?.detail;
      if (serverError?.error_type === 'INVALID_SIGNUP_PASSWORD') {
        setErrors({ signupPassword: 'Invalid signup code' });
      } else {
        setErrors({
          general: serverError?.message || 'Failed to create account'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const { score: passwordStrength, feedback: passwordFeedback } = 
    calculatePasswordStrength(formData.password);

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create an account
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Lets get to work
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            value={formData.name}
            onChange={handleChange}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            value={formData.email}
            onChange={handleChange}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            value={formData.password}
            onChange={handleChange}
          />
          {formData.password && (
            <div className="mt-2">
              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded">
                <div
                  className={`h-full rounded transition-all ${
                    passwordStrength >= 75
                      ? 'bg-green-500'
                      : passwordStrength >= 50
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${passwordStrength}%` }}
                />
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {passwordFeedback}
              </p>
            </div>
          )}
          {errors.password && (
            <p className="mt-1 text-sm text-red-500">{errors.password}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            value={formData.confirmPassword}
            onChange={handleChange}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="signupPassword"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Signup Code
          </label>
          <input
            id="signupPassword"
            name="signupPassword"
            type="password"
            required
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            value={formData.signupPassword}
            onChange={handleChange}
          />
          {errors.signupPassword && (
            <p className="mt-1 text-sm text-red-500">{errors.signupPassword}</p>
          )}
        </div>

        {errors.general && (
          <Alert variant="destructive">
            <AlertDescription>{errors.general}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
          disabled={isLoading}
        >
          Create account
        </Button>

        <div className="text-sm text-center">
          <Link
            href="/auth/login"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </form>
    </>
  );
}
