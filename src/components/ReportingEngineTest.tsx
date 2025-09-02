'use client';

import { useState } from 'react';
import { reportingEngineService } from '@/services/reportingEngine';

export default function ReportingEngineTest() {
  const [testResults, setTestResults] = useState<{
    health: boolean;
    tables: boolean;
    tableInfo: boolean;
    preview: boolean;
    generate: boolean;
  }>({
    health: false,
    tables: false,
    tableInfo: false,
    preview: false,
    generate: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const runTests = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Test 1: Health Check
      try {
        const health = await reportingEngineService.checkHealth();
        setTestResults(prev => ({ ...prev, health: health.status === 'healthy' }));
        console.log('Health check test passed:', health);
      } catch (err) {
        setTestResults(prev => ({ ...prev, health: false }));
        console.error('Health check test failed:', err);
      }

      // Test 2: Get Tables
      try {
        const tables = await reportingEngineService.getTables();
        setTestResults(prev => ({ ...prev, tables: tables.length > 0 }));
        console.log('Tables test passed:', tables);
      } catch (err) {
        setTestResults(prev => ({ ...prev, tables: false }));
        console.error('Tables test failed:', err);
      }

      // Test 3: Get Table Info (if tables exist)
      if (testResults.tables) {
        try {
          const tableInfo = await reportingEngineService.getTableInfo('vendor');
          setTestResults(prev => ({ ...prev, tableInfo: tableInfo.length > 0 }));
          console.log('Table info test passed:', tableInfo);
        } catch (err) {
          setTestResults(prev => ({ ...prev, tableInfo: false }));
          console.error('Table info test failed:', err);
        }
      }

      // Test 4: Preview Report
      try {
        const preview = await reportingEngineService.previewReport({
          tableName: 'vendor',
          columns: ['id', 'nameEn', 'status'],
          limit: 5
        });
        setTestResults(prev => ({ ...prev, preview: preview.data.length > 0 }));
        console.log('Preview test passed:', preview);
      } catch (err) {
        setTestResults(prev => ({ ...prev, preview: false }));
        console.error('Preview test failed:', err);
      }

      // Test 5: Generate Report (PDF)
      try {
        const report = await reportingEngineService.generateReport({
          tableName: 'vendor',
          columns: ['id', 'nameEn', 'status'],
          format: 'pdf',
          reportTitle: 'Test Report'
        });
        setTestResults(prev => ({ ...prev, generate: !!report.downloadUrl }));
        console.log('Generate test passed:', report);
      } catch (err) {
        setTestResults(prev => ({ ...prev, generate: false }));
        console.error('Generate test failed:', err);
      }

    } catch (err) {
      setError('Test execution failed');
      console.error('Test execution error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? '✅' : '❌';
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        External Reporting Engine Integration Test
      </h3>
      
      <button
        onClick={runTests}
        disabled={loading}
        className="mb-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? 'Running Tests...' : 'Run Integration Tests'}
      </button>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
          <span className="text-sm font-medium text-gray-700">Health Check</span>
          <span className="text-lg">{getStatusIcon(testResults.health)}</span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
          <span className="text-sm font-medium text-gray-700">Tables API</span>
          <span className="text-lg">{getStatusIcon(testResults.tables)}</span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
          <span className="text-sm font-medium text-gray-700">Table Info API</span>
          <span className="text-lg">{getStatusIcon(testResults.tableInfo)}</span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
          <span className="text-sm font-medium text-gray-700">Preview API</span>
          <span className="text-lg">{getStatusIcon(testResults.preview)}</span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
          <span className="text-sm font-medium text-gray-700">Generate API</span>
          <span className="text-lg">{getStatusIcon(testResults.generate)}</span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> This test component helps verify that the external reporting engine 
          integration is working correctly. Check the browser console for detailed logs.
        </p>
      </div>
    </div>
  );
} 