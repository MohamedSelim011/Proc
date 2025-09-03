'use client';

import { useState, useEffect } from 'react';
import { 
  Database, 
  Columns, 
  Filter, 
  Eye, 
  Download, 
  FileText, 
  Table2,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Settings,
  CheckSquare,
  Square,
  Link,
  Search,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { reportingEngineService, type TableInfo, type ColumnInfo, type ReportFilter } from '@/services/reportingEngine';

interface TableColumn {
  columnName: string;
  dataType: string;
  primaryKey: boolean;
  nullable: boolean;
}

interface RelatedTable {
  name: string;
  columns: TableColumn[];
  selected: boolean;
  selectedColumns: string[];
  relationship?: string;
}

export default function AdvancedReportsPage() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [relatedTables, setRelatedTables] = useState<RelatedTable[]>([]);
  const [whereClause, setWhereClause] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [toast, setToast] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({
    show: false,
    type: 'success',
    message: ''
  });

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadTableInfo(selectedTable);
      loadRelatedTables(selectedTable);
    }
  }, [selectedTable]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message });
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  const loadTables = async () => {
    try {
      setLoading(true);
      const tablesData = await reportingEngineService.getTables();
      setTables(tablesData);
    } catch (err) {
      setError('Failed to load tables');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTableInfo = async (tableName: string) => {
    try {
      setLoading(true);
      const response = await reportingEngineService.getTableInfo(tableName);
      console.log('Table info response:', response); // Debug log
      setTableColumns(response);
      setSelectedColumns([]);
    } catch (err) {
      setError('Failed to load table info');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedTables = async (tableName: string) => {
    try {
      // Get table relationships from the API
      let relationships: any[] = [];
      try {
        relationships = await reportingEngineService.getTableRelationships(tableName);
      } catch (err) {
        console.log('No relationships found, using fallback');
      }

      // If no relationships found, use intelligent fallback based on naming patterns
      const allTables = tables.filter(t => t !== tableName);
      let relatedTablesData: RelatedTable[] = [];

      if (relationships.length > 0) {
        // Use actual relationships - extract unique related table names
        const relatedTableNames = new Set<string>();
        relationships.forEach(rel => {
          if (rel.toTable && rel.toTable !== tableName) {
            relatedTableNames.add(rel.toTable);
          }
          if (rel.fromTable && rel.fromTable !== tableName) {
            relatedTableNames.add(rel.fromTable);
          }
        });

        relatedTablesData = Array.from(relatedTableNames).map(relatedTableName => ({
          name: relatedTableName,
          columns: [],
          selected: false,
          selectedColumns: [],
          relationship: 'Database relationship'
        }));
      } else {
        // Intelligent fallback based on common patterns
        const primaryTableLower = tableName.toLowerCase();
        relatedTablesData = allTables
          .filter(table => {
            const tableLower = table.toLowerCase();
            // Look for tables that might be related based on naming patterns
            return (
              tableLower.includes(primaryTableLower.slice(0, -1)) || // Remove 's' and check
              primaryTableLower.includes(tableLower.slice(0, -1)) ||
              tableLower.includes('item') && primaryTableLower.includes('order') ||
              tableLower.includes('detail') && primaryTableLower.includes('header') ||
              tableLower.includes('line') && primaryTableLower.includes('header') ||
              tableLower.includes('response') && primaryTableLower.includes('rfq') ||
              tableLower.includes('rfq') && primaryTableLower.includes('response')
            );
          })
          .slice(0, 8) // Limit to 8 related tables
          .map(table => ({
            name: table,
            columns: [],
            selected: false,
            selectedColumns: [],
            relationship: 'Auto-detected'
          }));
      }
      
      setRelatedTables(relatedTablesData);
      
      // Load columns for each related table
      for (const relatedTable of relatedTablesData) {
        if (relatedTable.name) { // Make sure the name exists
          try {
            const columns = await reportingEngineService.getTableInfo(relatedTable.name);
            setRelatedTables(prev => prev.map(rt => 
              rt.name === relatedTable.name 
                ? { ...rt, columns }
                : rt
            ));
          } catch (err) {
            console.error(`Failed to load columns for ${relatedTable.name}:`, err);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load related tables:', err);
    }
  };

  const toggleColumn = (columnName: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnName) 
        ? prev.filter(col => col !== columnName)
        : [...prev, columnName]
    );
  };

  const toggleRelatedTable = (tableName: string) => {
    setRelatedTables(prev => prev.map(rt => 
      rt.name === tableName 
        ? { ...rt, selected: !rt.selected, selectedColumns: !rt.selected ? [] : rt.selectedColumns }
        : rt
    ));
  };

  const toggleRelatedColumn = (tableName: string, columnName: string) => {
    setRelatedTables(prev => prev.map(rt => 
      rt.name === tableName 
        ? {
            ...rt,
            selectedColumns: rt.selectedColumns.includes(columnName)
              ? rt.selectedColumns.filter(col => col !== columnName)
              : [...rt.selectedColumns, columnName]
          }
        : rt
    ));
  };

  const generateReport = async (format: 'pdf' | 'excel') => {
    if (!selectedTable) {
      setError('Please select a table');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      if (format === 'pdf') {
        // Use the basic generate endpoint for PDF (which works)
        const request = {
          tableName: selectedTable,
          selectedColumns: selectedColumns.length > 0 ? selectedColumns : undefined
        };
        await reportingEngineService.generateReport(request);
      } else {
        // Use the basic generate-excel endpoint for Excel (which works)
        await reportingEngineService.generateExcelReport(selectedTable, selectedColumns.length > 0 ? selectedColumns : undefined);
      }

      const columnInfo = selectedColumns.length > 0 
        ? ` with ${selectedColumns.length} selected columns: ${selectedColumns.join(', ')}`
        : ' with all columns';
      
      showToast('success', `Report generation for ${format.toUpperCase()} format has been initiated${columnInfo}.`);
    } catch (err) {
      const errorMessage = `Failed to generate ${format.toUpperCase()} report`;
      setError(errorMessage);
      showToast('error', errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTables = tables.filter(table => 
    table.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Custom Report Generator</h1>
              <p className="text-gray-600 mt-1">Select data fields and generate reports from your database</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Tables */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-3">
                  <Database className="h-5 w-5 mr-2 text-blue-600" />
                  Tables
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tables..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {filteredTables.map((tableName) => (
                      <button
                        key={tableName}
                        onClick={() => setSelectedTable(tableName)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedTable === tableName
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center">
                          <Table2 className="h-4 w-4 mr-2" />
                          <span className="font-medium">{tableName}</span>
                        </div>
                      </button>
                    ))}
                    {filteredTables.length === 0 && searchTerm && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No tables found matching "{searchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedTable ? (
              <div className="space-y-6">
                {/* Table Header */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h2 className="text-xl font-bold text-gray-900">Table: {selectedTable}</h2>
                  <p className="text-gray-600 mt-1">Select columns and related tables to build your report</p>
                </div>

                {/* Columns from Primary Table */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Columns from {selectedTable}</h3>
                    <p className="text-sm text-gray-600 mt-1">Select the columns you want to include in your report</p>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {tableColumns.map((column) => (
                        <label key={column.columnName} className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedColumns.includes(column.columnName)}
                            onChange={() => toggleColumn(column.columnName)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{column.columnName}</div>
                            <div className="text-xs text-gray-500">{column.dataType}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {selectedColumns.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>{selectedColumns.length}</strong> column{selectedColumns.length !== 1 ? 's' : ''} selected: {selectedColumns.join(', ')}
                        </p>
                      </div>
                    )}
                    {selectedColumns.length === 0 && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>No columns selected.</strong> All columns will be included in the report.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Related Tables */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Link className="h-5 w-5 mr-2 text-green-600" />
                      Related Tables
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Include data from related tables in your report</p>
                  </div>
                  <div className="p-4">
                    {relatedTables.length > 0 ? (
                      <div className="space-y-4">
                        {relatedTables.filter(rt => rt.name).map((relatedTable) => (
                          <div key={relatedTable.name} className="border rounded-lg p-4 hover:border-gray-300 transition-colors">
                            <label className="flex items-center space-x-3 cursor-pointer mb-3">
                              <input
                                type="checkbox"
                                checked={relatedTable.selected}
                                onChange={() => toggleRelatedTable(relatedTable.name)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                              />
                              <div className="flex-1">
                                <span className="font-medium text-gray-900">{relatedTable.name}</span>
                                {relatedTable.relationship && (
                                  <span className="text-xs text-gray-500 ml-2">({relatedTable.relationship})</span>
                                )}
                              </div>
                            </label>
                            
                            {relatedTable.selected && (
                              <div className="ml-6">
                                <h4 className="text-sm font-medium text-gray-700 mb-3">
                                  Columns from {relatedTable.name}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {relatedTable.columns.map((column) => (
                                    <label key={column.columnName} className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors">
                                      <input
                                        type="checkbox"
                                        checked={relatedTable.selectedColumns.includes(column.columnName)}
                                        onChange={() => toggleRelatedColumn(relatedTable.name, column.columnName)}
                                        className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-4 w-4"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate">{column.columnName}</div>
                                        <div className="text-xs text-gray-500">{column.dataType}</div>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                                {relatedTable.selectedColumns.length > 0 && (
                                  <div className="mt-3 p-2 bg-green-50 rounded">
                                    <p className="text-sm text-green-800">
                                      <strong>{relatedTable.selectedColumns.length}</strong> column{relatedTable.selectedColumns.length !== 1 ? 's' : ''} selected: {relatedTable.selectedColumns.join(', ')}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Link className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>No related tables found</p>
                        <p className="text-sm">Try selecting a different table</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Filter Section */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Filter className="h-5 w-5 mr-2 text-orange-600" />
                      Filter (WHERE Clause)
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Add custom filters to narrow down your data</p>
                  </div>
                  <div className="p-4">
                    <input
                      type="text"
                      value={whereClause}
                      onChange={(e) => setWhereClause(e.target.value)}
                      placeholder="e.g., status = 'Open' AND total > 100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="mt-2 text-xs text-gray-500">
                      Use SQL WHERE clause syntax. Available columns: {selectedColumns.join(', ')}
                      {relatedTables.filter(rt => rt.selected && rt.name).map(rt => 
                        rt.selectedColumns.length > 0 ? `, ${rt.name}.${rt.selectedColumns.join(`, ${rt.name}.`)}` : ''
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => generateReport('pdf')}
                      disabled={loading}
                      className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      Download PDF
                    </button>
                    <button
                      onClick={() => generateReport('excel')}
                      disabled={loading}
                      className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FileText className="h-5 w-5 mr-2" />
                      Download Excel
                    </button>
                  </div>
                  {loading && (
                    <div className="text-center mt-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-2">Generating report...</p>
                    </div>
                  )}
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Table</h3>
                <p className="text-gray-500">
                  Choose a table from the sidebar to start building your custom report.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className={`rounded-xl shadow-2xl border min-w-80 max-w-md ${
            toast.type === 'success' 
              ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200' 
              : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
          }`}>
            <div className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {toast.type === 'success' ? (
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100">
                      <CheckCircle className="h-5 w-5 text-orange-600" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-red-100">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-5 ${
                    toast.type === 'success' ? 'text-orange-800' : 'text-red-800'
                  }`}>
                    {toast.type === 'success' ? 'Success!' : 'Error!'}
                  </p>
                  <p className={`mt-1 text-sm leading-5 break-words ${
                    toast.type === 'success' ? 'text-orange-700' : 'text-red-700'
                  }`}>
                    {toast.message}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <button
                    className={`rounded-md p-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                      toast.type === 'success'
                        ? 'text-orange-500 hover:text-orange-600 focus:ring-orange-500 hover:bg-orange-100'
                        : 'text-red-500 hover:text-red-600 focus:ring-red-500 hover:bg-red-100'
                    }`}
                    onClick={hideToast}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
