'use client';

import { ExtractForm } from '@/components/forms/ExtractForm';

export default function ExtractPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Extraction</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Extract a specific segment from a YouTube video
        </p>
      </div>
      <ExtractForm />
    </div>
  );
}
