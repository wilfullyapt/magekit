import React, { useState, useEffect } from 'react';
import { Users, Video, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '@/lib/axios';

const StatBox = ({ title, value, icon: Icon, description }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
      <Icon className="h-5 w-5 text-gray-400" />
    </div>
    <div className="mt-2">
      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  </div>
);

const RecentActivity = ({ activities }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
    <h3 className="font-medium text-gray-900 dark:text-white mb-4">Recent Activity</h3>
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-center space-x-4 border-b border-gray-200 dark:border-gray-700 pb-3">
          <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
            {getStatusIcon(activity.status)}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">Extraction #{activity.id}</div>
            <div className="text-sm text-gray-500">
              {new Date(activity.extraction_datetime).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const getStatusColor = (status) => {
  switch (status) {
    case 'completed': return 'bg-green-500';
    case 'failed': return 'bg-red-500';
    case 'pending': return 'bg-yellow-500';
    default: return 'bg-gray-500';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'completed': return <CheckCircle className="h-4 w-4 text-white" />;
    case 'failed': return <XCircle className="h-4 w-4 text-white" />;
    case 'pending': return <Clock className="h-4 w-4 text-white" />;
    default: return <Video className="h-4 w-4 text-white" />;
  }
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/dashboard/stats');
        setStats(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-100 rounded">
        Error loading dashboard: {error}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatBox
          title="Total Users"
          value={stats.system_stats.total_users}
          icon={Users}
          description="Active users in the system"
        />
        <StatBox
          title="Total Extractions"
          value={stats.system_stats.total_extractions}
          icon={Video}
          description="All-time extractions"
        />
        <StatBox
          title="Your Extractions"
          value={stats.user_stats.total_extractions}
          icon={Video}
          description="Your total extractions"
        />
        <StatBox
          title="Success Rate"
          value={`${((stats.user_stats.completed_extractions / stats.user_stats.total_extractions) * 100 || 0).toFixed(1)}%`}
          icon={CheckCircle}
          description="Your completion rate"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">Extraction Status</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Pending</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {stats.system_stats.pending_extractions}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Completed</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {stats.system_stats.completed_extractions}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Failed</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {stats.system_stats.failed_extractions}
              </span>
            </div>
          </div>
        </div>

        <RecentActivity activities={stats.recent_activity} />
      </div>
    </div>
  );
}
