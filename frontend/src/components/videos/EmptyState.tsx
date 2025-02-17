import { Play } from 'lucide-react';

interface EmptyStateProps {
  onCreateNew: () => void;
}

export function EmptyState({ onCreateNew }: EmptyStateProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-gray-100 p-4 dark:bg-gray-700">
          <Play className="h-8 w-8 text-gray-500" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No videos yet</h3>
        <p className="mt-2 text-sm text-gray-500">
          Start by creating a new video extraction
        </p>
        <button
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          onClick={onCreateNew}
        >
          Create Extraction
        </button>
      </div>
    </div>
  );
}
