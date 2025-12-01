'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3,
  Database,
  FileText,
  Filter,
  Download,
  Check,
} from 'lucide-react';

interface ColumnMeta {
  columnName: string;
  dataType?: string;
}

interface RelationshipMeta {
  fromTable: string;
  toTable: string;
  fromColumn: string;
  toColumn: string;
}

type ReportType = 'pdf' | 'excel';

export default function DynamicReportsPage() {
  const [tables, setTables] = useState<string[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnMeta[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);

  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  const [relationships, setRelationships] = useState<RelationshipMeta[]>([]);
  const [relatedTables, setRelatedTables] = useState<string[]>([]);
  const [selectedRelatedTables, setSelectedRelatedTables] = useState<string[]>(
    [],
  );
  const [relatedTableColumns, setRelatedTableColumns] = useState<
    Record<string, ColumnMeta[]>
  >({});
  const [selectedRelatedColumns, setSelectedRelatedColumns] = useState<
    Record<string, string[]>
  >({});

  const [whereClause, setWhereClause] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load tables on mount
  useEffect(() => {
    const loadTables = async () => {
      try {
        setTablesLoading(true);
        setTablesError(null);

        const res = await fetch('/api/reports/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(
            text || `Failed to load tables (status ${res.status})`,
          );
        }

        const data = await res.json();
        // Engine may return { tables: [...] } or a raw array
        const list: string[] = Array.isArray(data) ? data : data.tables || [];
        setTables(list);
      } catch (e: any) {
        setTablesError(
          e instanceof Error ? e.message : 'Failed to load database tables',
        );
      } finally {
        setTablesLoading(false);
      }
    };

    loadTables();
  }, []);

  const handleSelectTable = async (table: string) => {
    setSelectedTable(table);
    setSelectedColumns([]);
    setRelationships([]);
    setRelatedTables([]);
    setSelectedRelatedTables([]);
    setRelatedTableColumns({});
    setSelectedRelatedColumns({});
    setMessage(null);
    setError(null);

    try {
      setColumnsLoading(true);
      // Load columns
      const [colsRes, relRes] = await Promise.all([
        fetch('/api/reports/columns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tableName: table }),
        }),
        fetch('/api/reports/relationships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tableName: table }),
        }),
      ]);

      if (!colsRes.ok) {
        throw new Error(await colsRes.text());
      }
      const colsData = await colsRes.json();
      const cols: ColumnMeta[] = colsData.columns || colsData || [];
      setColumns(cols);
      // Don't pre-select columns - let user choose which ones they want

      if (relRes.ok) {
        const relData = await relRes.json();
        const rels: RelationshipMeta[] = relData || [];
        setRelationships(rels);
        const relTables = new Set<string>();
        rels.forEach((r) => {
          if (r.fromTable === table && r.toTable !== table) {
            relTables.add(r.toTable);
          } else if (r.toTable === table && r.fromTable !== table) {
            relTables.add(r.fromTable);
          }
        });
        setRelatedTables(Array.from(relTables));
      }
    } catch (e: any) {
      setError(
        e instanceof Error ? e.message : 'Failed to load table metadata',
      );
    } finally {
      setColumnsLoading(false);
    }
  };

  const togglePrimaryColumn = (col: string) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );
  };

  const toggleRelatedTable = async (table: string) => {
    const alreadySelected = selectedRelatedTables.includes(table);
    if (alreadySelected) {
      setSelectedRelatedTables((prev) => prev.filter((t) => t !== table));
      const { [table]: _, ...rest } = selectedRelatedColumns;
      setSelectedRelatedColumns(rest);
      return;
    }

    setSelectedRelatedTables((prev) => [...prev, table]);

    // Fetch columns for this related table if not already loaded
    if (!relatedTableColumns[table]) {
      try {
        const res = await fetch('/api/reports/columns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tableName: table }),
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }
        const data = await res.json();
        const cols: ColumnMeta[] = data.columns || data || [];
        setRelatedTableColumns((prev) => ({ ...prev, [table]: cols }));
        // Don't pre-select columns - let user choose which ones they want
        setSelectedRelatedColumns((prev) => ({
          ...prev,
          [table]: [],
        }));
      } catch (e: any) {
        console.error('Error loading related table columns:', e);
      }
    }
  };

  const toggleRelatedColumn = (table: string, col: string) => {
    setSelectedRelatedColumns((prev) => {
      const current = prev[table] || [];
      if (current.includes(col)) {
        return { ...prev, [table]: current.filter((c) => c !== col) };
      }
      return { ...prev, [table]: [...current, col] };
    });
  };

  const handleGenerate = async (type: ReportType) => {
    if (!selectedTable) {
      setError('Please select a primary table first.');
      return;
    }
    if (!selectedColumns.length) {
      setError('Please select at least one column from the primary table.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setMessage(null);

    try {
      const payload: any = {
        primaryTable: selectedTable,
        reportType: type,
        primaryTableColumns: selectedColumns,
        whereClause: whereClause || undefined,
      };

      if (selectedRelatedTables.length) {
        payload.relatedTables = selectedRelatedTables;
        payload.relatedTableColumns = selectedRelatedColumns;
      }

      const res = await fetch('/api/reports/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          text || `Report generation failed (status ${res.status})`,
        );
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ext = type === 'pdf' ? 'pdf' : 'xlsx';
      a.href = url;
      a.download = `${selectedTable}_report.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setMessage('Report generated and downloaded successfully.');
    } catch (e: any) {
      setError(
        e instanceof Error ? e.message : 'Failed to generate dynamic report',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredTables = tables.filter((t) =>
    t.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-wujha-primary" />
          Report Generator
        </h1>
        <p className="text-sm text-gray-600">
          Create dynamic reports directly from your procurement database tables.
        </p>
        {/* Step indicator aligned with the finance reporting UI */}
        <div className="flex items-center gap-6 text-sm mt-2">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                selectedTable ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <span
              className={
                selectedTable ? 'font-semibold text-gray-900' : 'text-gray-500'
              }
            >
              Select Table
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                selectedTable && columns.length ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
            <span
              className={
                selectedTable && columns.length
                  ? 'font-semibold text-gray-900'
                  : 'text-gray-500'
              }
            >
              Configure
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                selectedColumns.length ? 'bg-gray-700' : 'bg-gray-300'
              }`}
            />
            <span
              className={
                selectedColumns.length
                  ? 'font-semibold text-gray-900'
                  : 'text-gray-500'
              }
            >
              Generate
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tables sidebar */}
        <div className="lg:col-span-1 bg-white shadow rounded-lg">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Database Tables
              </h2>
              <p className="text-xs text-gray-500">
                Select a table to start configuring your report.
              </p>
            </div>
            <span className="text-xs text-gray-400">
              {tables.length ? tables.length : '--'}
            </span>
          </div>
          <div className="p-3 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tables..."
              className="w-full rounded-md border-gray-300 text-sm text-gray-900 bg-white shadow-sm focus:border-wujha-primary focus:ring-wujha-primary placeholder:text-gray-400"
            />
          </div>
          <div className="overflow-y-auto max-h-[500px]">
            {tablesLoading && (
              <div className="p-4 text-sm text-gray-500">Loading tables…</div>
            )}
            {tablesError && !tablesLoading && (
              <div className="p-4 text-sm text-red-600">{tablesError}</div>
            )}
            {!tablesLoading &&
              !tablesError &&
              filteredTables.map((table) => (
                <button
                  key={table}
                  onClick={() => handleSelectTable(table)}
                  className={`w-full text-left px-4 py-2.5 text-sm border-b border-gray-50 hover:bg-wujha-primary/5 transition-colors ${
                    selectedTable === table
                      ? 'bg-wujha-primary/10 text-wujha-primary font-medium'
                      : 'text-gray-700'
                  }`}
                >
                  {table}
                </button>
              ))}
          </div>
        </div>

        {/* Main configuration area */}
        <div className="lg:col-span-3 space-y-4">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
              {message}
            </div>
          )}

          {/* When no table selected */}
          {!selectedTable && (
            <div className="bg-white rounded-lg shadow flex flex-col items-center justify-center h-64 text-center text-gray-500">
              <FileText className="h-10 w-10 mb-3 text-gray-300" />
              <p className="font-medium text-gray-700">
                Select a table to begin
              </p>
              <p className="text-sm">
                Choose a table from the left to configure your dynamic report.
              </p>
            </div>
          )}

          {/* Configuration panels */}
          {selectedTable && (
            <div className="space-y-6">
              {/* Report Configuration Header */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-wujha-primary" />
                    <h2 className="text-sm font-semibold text-gray-900">
                      Report Configuration
                    </h2>
                  </div>
                  {columnsLoading && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Filter className="h-3 w-3" />
                      Loading columns…
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Table: <span className="text-wujha-primary font-medium">{selectedTable}</span>
                </p>
              </div>

              {/* Select Columns from table */}
              <div className="bg-white rounded-lg shadow p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-wujha-primary" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Select Columns from {selectedTable}
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {columns.map((col) => {
                    const checked = selectedColumns.includes(col.columnName);
                    return (
                      <label
                        key={col.columnName}
                        className={`flex items-center space-x-2 rounded-md border px-3 py-2 text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'border-wujha-primary bg-wujha-primary text-white'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              togglePrimaryColumn(col.columnName)
                            }
                            className="sr-only"
                          />
                          <div
                            className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all ${
                              checked
                                ? 'bg-white border-white'
                                : 'bg-white border-gray-300'
                            }`}
                          >
                            {checked && (
                              <Check className="h-3 w-3 text-wujha-primary" strokeWidth={3} />
                            )}
                          </div>
                        </div>
                        <span className={`truncate font-medium ${checked ? 'text-white' : ''}`}>{col.columnName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Related Tables */}
              <div className="bg-white rounded-lg shadow p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="h-5 w-5 text-wujha-primary" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Related Tables
                  </h3>
                </div>
                {relatedTables.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    No relationships detected for this table.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {relatedTables.map((rt) => {
                      const active = selectedRelatedTables.includes(rt);
                      return (
                        <label
                          key={rt}
                          className={`flex items-center space-x-2 rounded-md border px-3 py-2 text-xs cursor-pointer transition-colors ${
                            active
                              ? 'border-wujha-primary bg-wujha-primary text-white'
                              : 'border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggleRelatedTable(rt)}
                              className="sr-only"
                            />
                            <div
                              className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all ${
                                active
                                  ? 'bg-white border-white'
                                  : 'bg-white border-gray-300'
                              }`}
                            >
                              {active && (
                                <Check className="h-3 w-3 text-wujha-primary" strokeWidth={3} />
                              )}
                            </div>
                          </div>
                          <span className={`truncate font-medium ${active ? 'text-white' : ''}`}>{rt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Filter & Generate Report */}
              <div className="bg-white rounded-lg shadow p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-5 w-5 text-wujha-primary" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Filter & Generate Report
                  </h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-2">
                      WHERE Clause (Optional)
                    </label>
                    <textarea
                      value={whereClause}
                      onChange={(e) => setWhereClause(e.target.value)}
                      rows={4}
                      placeholder="e.g., status = 'Active' AND amount > 1000"
                      className="w-full rounded-md border-gray-300 text-sm text-gray-900 bg-white shadow-sm focus:border-wujha-primary focus:ring-wujha-primary placeholder:text-gray-400"
                    />
                  </div>
                  <div className="pt-2">
                    <p className="text-xs text-gray-500">
                      {selectedColumns.length} column{selectedColumns.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                </div>
              </div>

              {/* Related table columns */}
              {selectedRelatedTables.length > 0 && (
                <div className="space-y-6">
                  {selectedRelatedTables.map((rt) => {
                    const cols = relatedTableColumns[rt] || [];
                    const selectedCols = selectedRelatedColumns[rt] || [];
                    return (
                      <div key={rt} className="bg-white rounded-lg shadow p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <FileText className="h-5 w-5 text-wujha-primary" />
                          <h3 className="text-sm font-semibold text-gray-900">
                            Select Columns from {rt}
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                          {cols.map((c) => {
                            const checked = selectedCols.includes(
                              c.columnName,
                            );
                            return (
                              <label
                                key={c.columnName}
                                className={`flex items-center space-x-2 rounded-md border px-3 py-2 text-xs cursor-pointer transition-colors ${
                                  checked
                                    ? 'border-wujha-primary bg-wujha-primary text-white'
                                    : 'border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                              >
                                <div className="relative flex items-center justify-center">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      toggleRelatedColumn(rt, c.columnName)
                                    }
                                    className="sr-only"
                                  />
                                  <div
                                    className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all ${
                                      checked
                                        ? 'bg-white border-white'
                                        : 'bg-white border-gray-300'
                                    }`}
                                  >
                                    {checked && (
                                      <Check className="h-3 w-3 text-wujha-primary" strokeWidth={3} />
                                    )}
                                  </div>
                                </div>
                                <span className={`truncate font-medium ${checked ? 'text-white' : ''}`}>
                                  {c.columnName}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Generate buttons at the bottom */}
              {selectedTable && (
                <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleGenerate('pdf')}
                    disabled={isGenerating || selectedColumns.length === 0}
                    className="inline-flex items-center gap-2 rounded-md bg-wujha-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-wujha-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    {isGenerating ? 'Generating…' : 'Download PDF'}
                  </button>
                  <button
                    onClick={() => handleGenerate('excel')}
                    disabled={isGenerating || selectedColumns.length === 0}
                    className="inline-flex items-center gap-2 rounded-md bg-wujha-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-wujha-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    {isGenerating ? 'Generating…' : 'Download Excel'}
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}




