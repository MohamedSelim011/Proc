'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface MetabaseDashboard {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// MetabaseIframe Component
function MetabaseIframe({ 
  dashboardId, 
  height = "600px", 
  className = "" 
}: { 
  dashboardId: string | number; 
  height?: string; 
  className?: string; 
}) {
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateEmbedUrl = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/metabase/embed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dashboardId })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate embed URL');
        }

        const data = await response.json();
        setEmbedUrl(data.embedUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    generateEmbedUrl();
  }, [dashboardId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-wujha-primary mx-auto" />
          <p className="text-gray-600 mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !embedUrl) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-500">{error || 'Failed to load dashboard'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-wujha-primary text-white rounded hover:bg-wujha-primary-hover"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={embedUrl}
      width="100%"
      height={height}
      frameBorder="0"
      allowTransparency
      className={className}
      title="Metabase Dashboard"
    />
  );
}

export default function DynamicDashboard() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metabaseAvailable, setMetabaseAvailable] = useState(false);
  const [embedDashboards, setEmbedDashboards] = useState<MetabaseDashboard[]>([]);

  // Production Metabase URL (Railway instance)
  const METABASE_URL = process.env.NEXT_PUBLIC_METABASE_URL;
  // Try different dashboard IDs - the JWT shows "3-wujha-pr" so let's try that
  const METABASE_DASHBOARD_ID = 2; // Changed to string format
  const METABASE_SECRET_KEY = process.env.METABASE_SECRET_KEY;
  const MAIN_DASHBOARD_NAME = 'Wujha-PR';

  useEffect(() => {
    // Check if Metabase is available and fetch dashboards
    const checkMetabaseAndFetchDashboards = async () => {
      try {
        // Use proxy API to avoid CORS issues
        const response = await fetch('/api/metabase/health', {
          headers: {
            'Accept': 'application/json',
          }
        });
        
        const isAvailable = response.ok;
        setMetabaseAvailable(isAvailable);
        
        if (isAvailable) {
          // Try to fetch available dashboards directly from Metabase
          try {
            const dashboardsResponse = await fetch(`${METABASE_URL}/api/dashboard`, {
              mode: 'cors',
              headers: {
                'Accept': 'application/json',
              }
            });
            if (dashboardsResponse.ok) {
              const dashboards = await dashboardsResponse.json();
              const filteredDashboards = Array.isArray(dashboards) ? dashboards : 
                                       (dashboards.data ? dashboards.data : []);
              
              // Prioritize the main dashboard and filter out auto-generated ones
              const mainDashboard = filteredDashboards.find((d: MetabaseDashboard) => d.name === MAIN_DASHBOARD_NAME);
              const otherDashboards = filteredDashboards.filter((d: MetabaseDashboard) => 
                d.name !== MAIN_DASHBOARD_NAME && 
                !d.name.includes('Auto-generated') &&
                d.name !== 'Starter Dashboard'
              );
              
              // Put main dashboard first if it exists
              const orderedDashboards = mainDashboard ? [mainDashboard, ...otherDashboards] : otherDashboards;
              setEmbedDashboards(orderedDashboards);
            }
          } catch (dashboardError) {
            console.log('Could not fetch dashboards (this is normal if not logged in):', dashboardError);
            // Still mark as available since health check passed
          }
        }
      } catch (error) {
        console.log('Metabase connection error:', error);
        setMetabaseAvailable(false);
      } finally {
        setLoading(false);
      }
    };

    // Check immediately and then every 30 seconds
    checkMetabaseAndFetchDashboards();
    const interval = setInterval(checkMetabaseAndFetchDashboards, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const openMetabaseInNewTab = () => {
    // If main dashboard exists, open it directly
    const mainDashboard = embedDashboards.find(d => d.name === MAIN_DASHBOARD_NAME);
    const dashboardId = mainDashboard ? mainDashboard.id : METABASE_DASHBOARD_ID;
    window.open(`${METABASE_URL}/dashboard/${dashboardId}`, '_blank');
  };

  const startMetabase = () => {
    showToast('info', 'To start Metabase, run: ./scripts/start-metabase.sh\n\nOr manually run: docker-compose up -d');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-wujha-primary rounded-lg mx-auto mb-4 flex items-center justify-center shadow-sm animate-pulse">
            <span className="text-white font-bold text-xl">W</span>
          </div>
          <Loader2 className="h-8 w-8 animate-spin text-wujha-primary mx-auto" />
          <p className="text-gray-600 mt-4">Loading dynamic dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-red-500 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Dashboard Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dynamic Dashboard</h1>
            <p className="text-gray-600">Interactive analytics and insights for your procurement data</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={openMetabaseInNewTab}
              className="px-4 py-2 bg-wujha-primary text-white rounded-lg hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:ring-offset-2 flex items-center gap-2 font-medium transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Edit Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center gap-2 font-medium transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Metabase Dashboard */}
      {metabaseAvailable ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-wujha-primary p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Procurement Analytics Dashboard</h2>
                <p className="text-white/80">Interactive analytics and insights for your procurement data</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-white/80">Connected</span>
              </div>
            </div>
          </div>
          
          <div className="iframe-container">
            <MetabaseIframe 
              dashboardId={METABASE_DASHBOARD_ID}
              height="700px"
              className="w-full"
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Metabase Dashboard Unavailable</h3>
          <p className="text-gray-600 mb-6">The dynamic dashboard service is currently not available. Please try again later or contact your administrator.</p>
          <button
            onClick={startMetabase}
            className="px-6 py-2 bg-wujha-primary text-white rounded-lg hover:bg-wujha-primary-hover transition-colors"
          >
            Start Metabase Service
          </button>
        </div>
      )}
    </div>
  );
}
