// src/components/Nav.tsx
'use client';

import { useContext } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { AuthContext } from '@/providers/AuthProvider';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import api from '@/lib/axios';

interface NavProps {
  links: string[];
}

export function Nav({ links }: NavProps) {
  const pathname = usePathname();
  const authContext = useContext(AuthContext);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // You'll need to implement the actual logout logic
      await api.post('/api/auth/logout');
      authContext?.dispatch({ type: 'UNAUTHENTICATED' });

      setTimeout(() => {
        router.push('/auth/login');
      }, 100);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard">
                <div className="relative w-10 h-10">
                  <Image
                    src="/logo.png"
                    alt="Logo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </Link>
            </div>
            <div className="ml-10 flex items-center space-x-4">
              {links.map((link) => {
                const path = `/protected/${link}`;
                const isActive = pathname === path;

                return (
                  <Link
                    key={link}
                    href={path}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {link.charAt(0).toUpperCase() + link.slice(1)}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <LogOut className="h-5 w-5" />
              <span className="ml-2">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
