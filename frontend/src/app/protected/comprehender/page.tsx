// src/app/protected/comprehender/page.tsx
'use client';

import Dashboard from '@/components/Comprehender/InputGutHub';

export default function ComprehenderPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Overview of system and personal statistics
        </p>
      </div>
      <Dashboard />
    </div>
  );
}
