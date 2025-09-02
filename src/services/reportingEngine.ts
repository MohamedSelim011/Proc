export interface TableInfo {
  name: string;
  type: string;
  description?: string;
}

export interface ColumnInfo {
  columnName: string;
  dataType: string;
  primaryKey: boolean;
  nullable: boolean;
}

export interface TableRelationship {
  tableName: string;
  foreignKey: string;
  referencedTable: string;
  referencedColumn: string;
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface ReportFilter {
  column: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: string | number | string[] | number[];
  secondValue?: string | number; // For 'between' operator
}

export interface DatabaseConnectionDto {
  databaseEngine: string;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
}

export interface ColumnSelectionRequest {
  connectionDto: DatabaseConnectionDto;
  tableName: string;
  selectedColumns: string[];
  whereClause?: string;
}

export interface RelationalColumnSelectionRequest {
  connectionDto: DatabaseConnectionDto;
  primaryTable: string;
  relatedTables: string[];
  primaryTableColumns: string[];
  relatedTableColumns: Record<string, string[]>;
  whereClause?: string;
}

export interface ReportPreviewRequest {
  connectionDto: DatabaseConnectionDto;
  tableName: string;
  selectedColumns?: string[];
  filters?: ReportFilter[];
  limit?: number;
}

export interface ReportGenerationRequest {
  tableName: string;
  selectedColumns?: string[];
  filters?: ReportFilter[];
  format?: 'pdf' | 'excel';
}

export interface ReportPreviewResponse {
  data: any[];
  columns: string[];
  totalRows: number;
  previewRows: number;
}

export interface ReportGenerationResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
}

class ReportingEngineService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/reporting';
  }

  async checkHealth(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Health check API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error checking health:', error);
      throw new Error(`Failed to check health: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getTables(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Tables API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error fetching tables:', error);
      throw new Error(`Failed to fetch tables: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getTableInfo(tableName: string): Promise<ColumnInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/table-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tableName }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Table info API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Raw table info response:', data); // Debug log
      return data.columns || [];
    } catch (error) {
      console.error('Error fetching table info:', error);
      throw new Error(`Failed to fetch table info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getTableRelationships(tableName: string): Promise<TableRelationship[]> {
    try {
      const response = await fetch(`${this.baseUrl}/table-relationships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tableName }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Table relationships API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error fetching table relationships:', error);
      throw new Error(`Failed to fetch table relationships: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async previewReport(request: ReportPreviewRequest): Promise<ReportPreviewResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Preview API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error previewing report:', error);
      throw new Error(`Failed to preview report: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateReport(request: ReportGenerationRequest): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Generate API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      // Handle binary response (PDF)
      if (response.headers.get('content-type')?.includes('application/pdf')) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${request.tableName}_report.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return;
      }
      
      // Handle other response types
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating report:', error);
      throw new Error(`Failed to generate report: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateExcelReport(tableName: string, selectedColumns?: string[]): Promise<void> {
    try {
      const requestBody: any = { tableName };
      if (selectedColumns && selectedColumns.length > 0) {
        requestBody.selectedColumns = selectedColumns;
      }

      const response = await fetch(`${this.baseUrl}/generate-excel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Generate Excel API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      // Handle binary response (Excel)
      if (response.headers.get('content-type')?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
          response.headers.get('content-type')?.includes('application/octet-stream')) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tableName}_report.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return;
      }
      
      // Handle other response types
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating Excel report:', error);
      throw new Error(`Failed to generate Excel report: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Updated methods to use correct endpoint names

  async generateReportWithColumns(request: ColumnSelectionRequest): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-with-columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Generate with columns API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      // Handle binary response (PDF)
      if (response.headers.get('content-type')?.includes('application/pdf')) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${request.tableName}_report.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return;
      }
      
      // Handle other response types
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating report with columns:', error);
      throw new Error(`Failed to generate report with columns: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateExcelReportWithColumns(request: ColumnSelectionRequest): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-excel-with-columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Generate Excel with columns API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      // Handle binary response (Excel)
      if (response.headers.get('content-type')?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
          response.headers.get('content-type')?.includes('application/octet-stream')) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${request.tableName}_report.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return;
      }
      
      // Handle other response types
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating Excel report with columns:', error);
      throw new Error(`Failed to generate Excel report with columns: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Legacy methods for backward compatibility (keeping the old names)
  async generateReportWithSelectedColumns(request: ColumnSelectionRequest): Promise<void> {
    return this.generateReportWithColumns(request);
  }

  async generateExcelReportWithSelectedColumns(request: ColumnSelectionRequest): Promise<void> {
    return this.generateExcelReportWithColumns(request);
  }

  // Other methods remain the same...

  async generateCustomReport(tableName: string, whereClause?: string) {
    try {
      const response = await fetch(`${this.baseUrl}/generate-custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tableName, whereClause }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Generate custom API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      return response;
    } catch (error) {
      console.error('Error generating custom report:', error);
      throw new Error(`Failed to generate custom report: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateCustomExcelReport(tableName: string, whereClause?: string) {
    try {
      const response = await fetch(`${this.baseUrl}/generate-custom-excel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tableName, whereClause }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Generate custom Excel API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      return response;
    } catch (error) {
      console.error('Error generating custom Excel report:', error);
      throw new Error(`Failed to generate custom Excel report: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateRelationalReportWithColumns(request: RelationalColumnSelectionRequest) {
    try {
      const response = await fetch(`${this.baseUrl}/generate-relational-with-columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Generate relational with columns API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      return response;
    } catch (error) {
      console.error('Error generating relational report with columns:', error);
      throw new Error(`Failed to generate relational report with columns: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateRelationalExcelReportWithColumns(request: RelationalColumnSelectionRequest) {
    try {
      const response = await fetch(`${this.baseUrl}/generate-relational-excel-with-columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Generate relational Excel with columns API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      return response;
    } catch (error) {
      console.error('Error generating relational Excel report with columns:', error);
      throw new Error(`Failed to generate relational Excel report with columns: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async previewReportWithSelectedColumns(request: ColumnSelectionRequest) {
    try {
      const response = await fetch(`${this.baseUrl}/preview-with-columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Preview with columns API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      return response;
    } catch (error) {
      console.error('Error previewing report with columns:', error);
      throw new Error(`Failed to preview report with columns: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async previewExcelReportWithSelectedColumns(request: ColumnSelectionRequest) {
    try {
      const response = await fetch(`${this.baseUrl}/preview-excel-with-columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Preview Excel with columns API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      return response;
    } catch (error) {
      console.error('Error previewing Excel report with columns:', error);
      throw new Error(`Failed to preview Excel report with columns: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async previewRelationalReportWithColumns(request: RelationalColumnSelectionRequest) {
    try {
      const response = await fetch(`${this.baseUrl}/preview-relational-with-columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Preview relational with columns API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      return response;
    } catch (error) {
      console.error('Error previewing relational report with columns:', error);
      throw new Error(`Failed to preview relational report with columns: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async previewRelationalExcelReportWithColumns(request: RelationalColumnSelectionRequest) {
    try {
      const response = await fetch(`${this.baseUrl}/preview-relational-excel-with-columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Preview relational Excel with columns API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      return response;
    } catch (error) {
      console.error('Error previewing relational Excel report with columns:', error);
      throw new Error(`Failed to preview relational Excel report with columns: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async testConnection(connectionDto: DatabaseConnectionDto) {
    try {
      const response = await fetch(`${this.baseUrl}/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionDto }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Test connection API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error testing connection:', error);
      throw new Error(`Failed to test connection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const reportingEngineService = new ReportingEngineService();
