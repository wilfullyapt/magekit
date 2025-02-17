import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Link as LinkIcon, Type } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExtractionCreate } from '@/types/api';
import api from '@/lib/axios';

interface FormData {
  youtubeUrl: string;
  startTime: string;
  endTime: string;
  notes: string;
  generateCaptions: boolean;
}

interface FormErrors {
  youtubeUrl?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  general?: string;
}

export function ExtractForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ExtractionCreate>({
    youtubeUrl: '',
    startTime: '',
    endTime: '',
    notes: '',
    generateCaptions: false
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ExtractionCreate | 'general', string>>>({});

  // Formats input like "123" into "1:23" or "12345" into "1:23:45"
  const formatTimeInput = (value: string): string => {
    // Remove non-digits
    const numbers = value.replace(/[^\d]/g, '');

    // Handle different length inputs
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      // For MM:SS format
      const minutes = numbers.slice(0, -2);
      const seconds = numbers.slice(-2);
      return `${minutes}:${seconds}`;
    } else {
      // For HH:MM:SS format
      const hours = numbers.slice(0, -4);
      const minutes = numbers.slice(-4, -2);
      const seconds = numbers.slice(-2);
      return `${hours}:${minutes}:${seconds}`;
    }
  };

  // Converts time string (HH:MM:SS or MM:SS) to seconds
  const timeToSeconds = (time: string): number => {
    const parts = time.split(':').map(Number);
    if (parts.length === 2) {
      // MM:SS format
      return parts[0] * 60 + parts[1];
    }
    // HH:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // URL validation
    if (!formData.youtubeUrl) {
      newErrors.youtubeUrl = 'Spotify URL is required';
    } else if (!formData.youtubeUrl.match(/^(https?:\/\/)?(open\.spotify\.com)\/.+$/)) {
      newErrors.youtubeUrl = 'Please enter a valid Spotify URL (e.g., https://open.spotify.com/...)';
    }

    // Time validation
    const timeFormat = /^(?:(?:\d{1,2}:)?\d{1,2}:\d{2})$/;
    
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    } else if (!timeFormat.test(formData.startTime)) {
      newErrors.startTime = 'Invalid time format (use MM:SS or HH:MM:SS)';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    } else if (!timeFormat.test(formData.endTime)) {
      newErrors.endTime = 'Invalid time format (use MM:SS or HH:MM:SS)';
    }

    // Duration validation
    if (!newErrors.startTime && !newErrors.endTime) {
      const startSeconds = timeToSeconds(formData.startTime);
      const endSeconds = timeToSeconds(formData.endTime);

      if (endSeconds <= startSeconds) {
        newErrors.endTime = 'End time must be after start time';
      }
      if (endSeconds - startSeconds > 600) { // 10 minutes max
        newErrors.endTime = 'Clip duration cannot exceed 10 minutes';
      }
    }

    // Notes validation
    if (formData.notes.length > 300) {
      newErrors.notes = 'Notes must not exceed 300 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      await api.post('/api/extract', formData);
      // Redirect immediately after successful submission
      router.push('/protected/videos');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to start extraction. Please try again.';
      setErrors({ general: errorMessage });
      setIsSubmitting(false);
    }
  };


  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <Alert variant="destructive">
            <AlertDescription>{errors.general}</AlertDescription>
          </Alert>
        )}

        {/* Spotify URL field */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <LinkIcon className="h-4 w-4 inline-block mr-2" />
            Spotify URL
          </label>
          <input
            type="text"
            placeholder="https://open.spotify.com/..."
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            value={formData.youtubeUrl}
            onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
            disabled={isSubmitting}
          />
          {errors.youtubeUrl && (
            <p className="text-sm text-red-500">{errors.youtubeUrl}</p>
          )}
          <p className="text-sm text-gray-500">
            Enter the URL of a Spotify podcast episode or show
          </p>
        </div>

        {/* Time inputs */}
        <div className="grid grid-cols-2 gap-4">
          {/* Start time */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <Clock className="h-4 w-4 inline-block mr-2" />
              Start Time (MM:SS)
            </label>
            <input
              type="text"
              placeholder="1:23"
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md"
              value={formData.startTime}
              onChange={(e) => setFormData({
                ...formData,
                startTime: formatTimeInput(e.target.value)
              })}
              disabled={isSubmitting}
            />
            {errors.startTime && (
              <p className="text-sm text-red-500">{errors.startTime}</p>
            )}
          </div>

          {/* End time */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <Clock className="h-4 w-4 inline-block mr-2" />
              End Time (MM:SS)
            </label>
            <input
              type="text"
              placeholder="2:34"
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md"
              value={formData.endTime}
              onChange={(e) => setFormData({
                ...formData,
                endTime: formatTimeInput(e.target.value)
              })}
              disabled={isSubmitting}
            />
            {errors.endTime && (
              <p className="text-sm text-red-500">{errors.endTime}</p>
            )}
          </div>
        </div>

        {/* Notes field */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <Type className="h-4 w-4 inline-block mr-2" />
            Notes
          </label>
          <textarea
            placeholder="Add notes about this clip..."
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md h-24"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            disabled={isSubmitting}
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formData.notes.length}/300 characters
          </p>
          {errors.notes && (
            <p className="text-sm text-red-500">{errors.notes}</p>
          )}
        </div>

        {/* Generate captions toggle */}
        <div className="flex items-center space-x-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={formData.generateCaptions}
              onChange={(e) => setFormData({
                ...formData,
                generateCaptions: e.target.checked
              })}
              disabled={isSubmitting}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Generate Captions
            </span>
          </label>
        </div>

        {/* Form buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push('/protected/videos')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Starting Extraction...' : 'Start Extraction'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ExtractForm;
