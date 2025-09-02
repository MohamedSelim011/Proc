'use client';

import { useState } from 'react';

export default function ReportingEngineDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    
    try {
      // Test direct connectivity to external reporting engine
      const externalTest = await fetch('https://reporting-engine-production-a330.up.railway.app/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Test local API health endpoint
      const localTest = await fetch('/api/reporting/health', {
        method: 'GET',
      });

      // Test local API tables endpoint
      const tablesTest = await fetch('/api/reporting/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setDiagnostics({
        timestamp: new Date().toISOString(),
        externalEngine: {
          url: 'https://reporting-engine-production-a330.up.railway.app/health',
          status: externalTest.status,
          statusText: externalTest.statusText,
          ok: externalTest.ok,
          response: externalTest.ok ? await externalTest.text() : 'Failed to get response'
        },
        localHealth: {
          url: '/api/reporting/health',
          status: localTest.status,
          statusText: localTest.statusText,
          ok: localTest.ok,
          response: localTest.ok ? await localTest.json() : 'Failed to get response'
        },
        localTables: {
          url: '/api/reporting/tables',
          status: tablesTest.status,
          statusText: tablesTest.statusText,
          ok: tablesTest.ok,
          response: tablesTest.ok ? await tablesTest.json() : 'Failed to get response'
        }
      });
    } catch (error) {
      setDiagnostics({
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Reporting Engine Diagnostics
      </h3>
      
      <button
        onClick={runDiagnostics}
        disabled={loading}
        className="mb-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
      >
        {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
      </button>

      {diagnostics && (
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-md">
            <h4 className="font-medium text-gray-700 mb-2">Diagnostics Results</h4>
            <p className="text-sm text-gray-600">Timestamp: {diagnostics.timestamp}</p>
          </div>

          {diagnostics.error ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">Error: {diagnostics.error}</p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-medium text-blue-700 mb-2">External Reporting Engine</h4>
                <div className="text-sm text-blue-600 space-y-1">
                  <p>URL: {diagnostics.externalEngine.url}</p>
                  <p>Status: {diagnostics.externalEngine.status} {diagnostics.externalEngine.statusText}</p>
                  <p>Response: {diagnostics.externalEngine.response}</p>
                </div>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <h4 className="font-medium text-green-700 mb-2">Local Health API</h4>
                <div className="text-sm text-green-600 space-y-1">
                  <p>URL: {diagnostics.localHealth.url}</p>
                  <p>Status: {diagnostics.localHealth.status} {diagnostics.localHealth.statusText}</p>
                  <p>Response: {JSON.stringify(diagnostics.localHealth.response, null, 2)}</p>
                </div>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                <h4 className="font-medium text-purple-700 mb-2">Local Tables API</h4>
                <div className="text-sm text-purple-600 space-y-1">
                  <p>URL: {diagnostics.localTables.url}</p>
                  <p>Status: {diagnostics.localTables.status} {diagnostics.localTables.statusText}</p>
                  <p>Response: {JSON.stringify(diagnostics.localTables.response, null, 2)}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-700">
          <strong>Note:</strong> This diagnostic tool tests connectivity to both the external reporting engine 
          and your local API endpoints to help identify where the issue lies.
        </p>
      </div>
    </div>
  );
} 