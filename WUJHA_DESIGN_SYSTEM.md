# Wujha Financial System - Design System & Screen Structure Guide

## Table of Contents
1. [Color Palette & Theme](#color-palette--theme)
2. [Typography](#typography)
3. [List Screen Structure](#list-screen-structure)
4. [Detail Screen Structure](#detail-screen-structure)
5. [New/Create Form Screen Structure](#newcreate-form-screen-structure)
6. [Common Patterns](#common-patterns)
7. [Component Guidelines](#component-guidelines)

---

## Color Palette & Theme

### Primary Colors
The Wujha brand uses a deep orange/red-orange color scheme for primary actions and brand identity.

- **Primary**: `#FF5722` (Deep Orange/Red-Orange)
  - Used for: Primary buttons, links, focus states, brand elements
  - Tailwind class: `bg-wujha-primary`, `text-wujha-primary`, `border-wujha-primary`
  
- **Primary Hover**: `#E64A19` (Darker Deep Orange)
  - Used for: Hover states on primary elements
  - Tailwind class: `hover:bg-wujha-primary-hover`, `hover:text-wujha-primary-hover`

### Status Colors
Standard status indicators following Material Design principles:

- **Success**: `#4CAF50` (Green)
  - Tailwind class: `bg-green-600`, `hover:bg-green-700`
  - Usage: Success messages, positive actions, completed states

- **Warning**: `#FFC107` (Amber/Yellow)
  - Tailwind class: `bg-yellow-600`, `hover:bg-yellow-700`
  - Usage: Warning messages, caution states

- **Danger**: `#F44336` (Red)
  - Tailwind class: `bg-red-600`, `hover:bg-red-700`
  - Usage: Error messages, destructive actions, negative states

- **Info**: `#2196F3` (Blue)
  - Tailwind class: `bg-blue-600`, `hover:bg-blue-700`
  - Usage: Informational messages, neutral actions

### Supporting Colors

#### Text Colors
- **Text Primary**: `#212121` (Dark Gray)
  - Tailwind class: `text-gray-900` or `text-text-primary`
  - Usage: Main content, headings

- **Text Secondary**: `#757575` (Medium Gray)
  - Tailwind class: `text-gray-600` or `text-text-secondary`
  - Usage: Secondary text, descriptions, helper text

#### Border Colors
- **Border Default**: `#E0E0E0` (Light Gray)
  - Tailwind class: `border-gray-200` or `border-border`
  - Usage: Card borders, input borders, dividers

#### Background Colors
- **Background Light**: `#F5F5F5` (Very Light Gray)
  - Tailwind class: `bg-gray-50` or `bg-bg-light`
  - Usage: Page backgrounds, disabled input backgrounds

- **Background Sidebar**: `#FAFAFA` (Off-White)
  - Tailwind class: `bg-bg-sidebar`
  - Usage: Sidebar backgrounds, alternate row backgrounds

### Color Usage Patterns

#### Primary Actions
```typescript
// Standard primary button
className="bg-wujha-primary text-white hover:bg-wujha-primary-hover focus:ring-wujha-primary"

// Primary button with icon
className="flex items-center gap-2 px-4 py-2 bg-wujha-primary text-white rounded-lg hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:ring-offset-2 transition-colors"
```

#### Disabled States
```typescript
// Disabled primary button (60% opacity)
className="bg-wujha-primary/60 text-white cursor-not-allowed"
```

#### Focus States
```typescript
// Input focus ring
className="focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-transparent"

// Input focus border
className="focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
```

#### Accent Variations
```typescript
// Subtle border accent (20% opacity)
className="border-wujha-primary/20"

// Background tint (10% opacity)
className="bg-wujha-primary/10"

// Gradient background
className="bg-gradient-to-r from-wujha-primary to-wujha-primary-hover"
```

---

## Typography

### Font Families
- **Sans Serif**: Geist Sans (with system-ui fallback)
  - Usage: Body text, UI elements, headings
  - Tailwind class: `font-sans` (default)

- **Monospace**: Geist Mono
  - Usage: Code, invoice numbers, IDs, technical data
  - Tailwind class: `font-mono`

### Font Sizes & Weights
- **Page Title**: `text-2xl font-bold text-gray-900`
- **Section Title**: `text-lg font-semibold text-gray-900`
- **Card Title**: `text-lg font-semibold text-gray-900`
- **Body Text**: `text-sm text-gray-700` or `text-base text-gray-700`
- **Helper Text**: `text-xs text-gray-500`
- **Label**: `text-sm font-medium text-gray-700`

---

## List Screen Structure

### Standard Layout Pattern

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/apiFetch";
import { Search, Filter, Loader2, Plus } from "lucide-react";

export default function EntityListPage() {
  const router = useRouter();
  const [data, setData] = useState<EntityList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch function with filters
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("limit", "50");

      const response = await apiFetch(`/api/module/entities?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Entity Name</h1>
        </div>
        <Card>
          <div className="p-12 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-wujha-primary mb-4" />
            <p>Loading data...</p>
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Entity Name</h1>
        </div>
        <Card>
          <div className="p-6 text-center text-red-600">
            Error loading data: {error}
            <button
              onClick={fetchData}
              className="ml-4 px-4 py-2 bg-wujha-primary text-white rounded-lg hover:bg-wujha-primary-hover transition-colors"
            >
              Retry
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entity Name</h1>
          <p className="text-gray-600 mt-1">Description of what this list shows</p>
        </div>
        <button
          onClick={() => router.push("/finance/module/entities/new")}
          className="flex items-center gap-2 px-4 py-2 bg-wujha-primary text-white rounded-lg hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:ring-offset-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create New</span>
        </button>
      </div>

      {/* Filters Section */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Search & Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, code, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
              >
                <option value="all">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="APPROVED">Approved</option>
                {/* Add more options */}
              </select>
            </div>
            
            {/* Additional filters as needed */}
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Column 1
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Column 2
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.items && data.items.length > 0 ? (
                data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-wujha-primary">
                      {item.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* Status badge */}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => router.push(`/finance/module/entities/${item.id}`)}
                        className="text-wujha-primary hover:text-wujha-primary-hover"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
```

### List Screen Components

#### 1. Header Section
- **Title**: `text-2xl font-bold text-gray-900`
- **Description**: `text-gray-600 mt-1`
- **Action Button**: Primary button with icon, positioned on the right

#### 2. Filters Section
- Wrapped in a `Card` component
- Grid layout: `grid grid-cols-1 md:grid-cols-4 gap-4`
- Search input with icon on the left
- Filter dropdowns with proper labels
- All inputs use `focus:ring-wujha-primary` for focus states

#### 3. Data Table
- Wrapped in a `Card` component
- Responsive with `overflow-x-auto`
- Table header: `bg-gray-50 border-b border-gray-200`
- Table rows: `hover:bg-gray-50` for interactivity
- Status badges with appropriate colors
- Action buttons styled with `text-wujha-primary`

#### 4. Loading State
- Centered spinner with `Loader2` icon
- Spinner color: `text-wujha-primary`
- Loading message below spinner

#### 5. Error State
- Error message in red
- Retry button using primary color

#### 6. Empty State
- Centered message: "No data found"
- Consider adding a CTA button to create first item

---

## Detail Screen Structure

### Standard Layout Pattern

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/apiFetch";
import { useToast } from "@/components/ui/Toast";
import { 
  ArrowLeft, 
  Loader2, 
  FileText,
  Calendar,
  DollarSign,
  Send,
  CheckCircle2,
  XCircle
} from "lucide-react";

interface EntityDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function EntityDetailPage({ params }: EntityDetailPageProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [entityId, setEntityId] = useState<string | null>(null);
  const [entity, setEntity] = useState<TEntityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [processing, setProcessing] = useState(false);

  // Resolve params
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setEntityId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  const fetchEntity = useCallback(async () => {
    if (!entityId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch(`/api/module/entities/${entityId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Entity not found");
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setEntity(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch entity";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    if (entityId) {
      fetchEntity();
    }
  }, [entityId, fetchEntity]);

  const handleAction = async () => {
    if (!entityId) return;
    
    try {
      setProcessing(true);
      const response = await apiFetch(`/api/module/entities/${entityId}/action`, {
        method: "POST",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        showToast('error', errorData.error?.message || 'Action failed');
        return;
      }
      
      showToast('success', 'Action completed successfully!');
      await fetchEntity(); // Refresh data
    } catch (err) {
      showToast('error', 'Failed to perform action');
    } finally {
      setProcessing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
        </div>
        <Card>
          <div className="p-12 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-wujha-primary mb-4" />
            <p>Loading entity details...</p>
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !entity) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Error</h1>
        </div>
        <Card>
          <div className="p-6 text-center text-red-600">
            {error || "Entity not found"}
            <button
              onClick={() => router.push("/finance/module/entities")}
              className="ml-4 px-4 py-2 bg-wujha-primary text-white rounded-lg hover:bg-wujha-primary-hover transition-colors"
            >
              Back to List
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{entity.name}</h1>
            <p className="text-gray-600 mt-1">Entity Code: {entity.code}</p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleAction}
            disabled={processing}
            className="inline-flex items-center gap-2 px-6 py-3 bg-wujha-primary text-white rounded-lg hover:bg-wujha-primary-hover transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Action</span>
          </button>
        </div>
      </div>

      {/* Status Banner (if applicable) */}
      {entity.status && (
        <Card className={`mb-6 border-l-4 ${
          entity.status === 'APPROVED' ? 'border-green-500' :
          entity.status === 'DRAFT' ? 'border-gray-500' :
          'border-yellow-500'
        }`}>
          <div className="p-4 flex items-center gap-3">
            {entity.status === 'APPROVED' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-yellow-600" />
            )}
            <div>
              <p className="font-semibold text-gray-900">Status: {entity.status}</p>
              <p className="text-sm text-gray-600">Current workflow state</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          {['overview', 'details', 'history', 'documents'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? "border-wujha-primary text-wujha-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Summary Card */}
            <Card>
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <FileText className="w-5 h-5 text-wujha-primary mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Summary</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Code:</span>
                    <span className="font-medium text-gray-900">{entity.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium text-gray-900">{entity.name}</span>
                  </div>
                  {/* Add more summary fields */}
                </div>
              </div>
            </Card>

            {/* Additional Info Card */}
            <Card>
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <Calendar className="w-5 h-5 text-wujha-primary mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Dates</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(entity.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {/* Add more date fields */}
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'details' && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Information</h3>
              {/* Detailed information content */}
            </div>
          </Card>
        )}

        {/* Additional tabs... */}
      </div>
    </div>
  );
}
```

### Detail Screen Components

#### 1. Header Section
- **Back Button**: Left side with `ArrowLeft` icon
- **Title**: Entity name or code
- **Subtitle**: Additional identifying information
- **Action Buttons**: Right side, primary color for main actions

#### 2. Status Banner (Optional)
- Colored left border based on status
- Icon indicating status
- Status text and description

#### 3. Tab Navigation
- Horizontal tabs with bottom border
- Active tab: `border-wujha-primary text-wujha-primary`
- Inactive tabs: `text-gray-500 hover:text-gray-700`

#### 4. Tab Content
- **Overview Tab**: Grid layout with summary cards
- **Details Tab**: Full-width card with detailed information
- **History Tab**: Timeline or list of events
- **Documents Tab**: File upload and list
- **Accounting Tab**: Journal entries table

#### 5. Cards
- Use `Card` component for content sections
- Icons in card headers with `text-wujha-primary`
- Proper spacing: `p-6` for padding
- Grid layouts: `grid grid-cols-1 lg:grid-cols-2 gap-6`

---

## New/Create Form Screen Structure

### Standard Layout Pattern

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/apiFetch";
import { useToast } from "@/components/ui/Toast";
import { FileText, Loader2, Save } from "lucide-react";

export default function NewEntityPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    // Add more fields
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    
    if (!formData.code.trim()) {
      newErrors.code = "Code is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast('error', 'Please fix the errors in the form');
      return;
    }

    try {
      setLoading(true);
      const response = await apiFetch("/api/module/entities", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        showToast('error', errorData.error?.message || 'Failed to create entity');
        return;
      }

      const data = await response.json();
      showToast('success', 'Entity created successfully!');
      router.push(`/finance/module/entities/${data.id}`);
    } catch (err) {
      showToast('error', 'Failed to create entity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Entity</h1>
        <p className="text-gray-600 mt-1">Fill in the form below to create a new entity</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
            <FileText className="w-5 h-5 text-wujha-primary" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Entity Information</h2>
              <p className="text-sm text-gray-500">
                Provide basic information about the entity.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                    errors.name
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                  }`}
                  required
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Code Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleChange("code", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                    errors.code
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                  }`}
                  required
                />
                {errors.code && (
                  <p className="mt-1 text-sm text-red-600">{errors.code}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Unique identifier for this entity</p>
              </div>
            </div>

            {/* Full-width field example */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors"
              />
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2 bg-wujha-primary text-white rounded-lg hover:bg-wujha-primary-hover transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Create Entity</span>
          </button>
        </div>
      </form>
    </div>
  );
}
```

### Form Screen Components

#### 1. Header Section
- Page title and description
- Clear indication of what is being created

#### 2. Form Structure
- Wrapped in `Card` component
- Section header with icon and description
- Grid layout for form fields: `grid grid-cols-1 md:grid-cols-2 gap-6`
- Full-width fields for longer content (textarea, etc.)

#### 3. Form Fields
- **Label**: `text-sm font-medium text-gray-700 mb-1`
- **Input**: Standard styling with focus states
- **Error State**: Red border and error message below
- **Helper Text**: `text-xs text-gray-500` below field

#### 4. Validation
- Inline validation with error messages
- Required fields marked with asterisk (*)
- Error styling: `border-red-300 focus:ring-red-500`

#### 5. Action Buttons
- **Cancel**: Secondary button (gray border)
- **Submit**: Primary button (wujha-primary)
- Loading state with spinner
- Disabled state when processing

---

## Common Patterns

### Status Badges
```typescript
const getStatusBadge = (status: string) => {
  const statusConfig = {
    DRAFT: { bg: "bg-gray-100", text: "text-gray-800" },
    PENDING_APPROVAL: { bg: "bg-yellow-100", text: "text-yellow-800" },
    APPROVED: { bg: "bg-green-100", text: "text-green-800" },
    REJECTED: { bg: "bg-red-100", text: "text-red-800" },
    CANCELED: { bg: "bg-gray-100", text: "text-gray-800" },
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
  
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
      {status}
    </span>
  );
};
```

### Loading Spinner
```typescript
<Loader2 className="w-8 h-8 animate-spin text-wujha-primary" />
```

### Empty States
```typescript
<div className="p-12 text-center text-gray-500">
  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
  <p className="text-lg font-medium mb-2">No items found</p>
  <p className="text-sm mb-4">Get started by creating your first item</p>
  <button
    onClick={() => router.push("/finance/module/entities/new")}
    className="px-4 py-2 bg-wujha-primary text-white rounded-lg hover:bg-wujha-primary-hover"
  >
    Create New
  </button>
</div>
```

### Toast Notifications
```typescript
import { useToast } from "@/components/ui/Toast";

const { showToast } = useToast();

// Success
showToast('success', 'Operation completed successfully!');

// Error
showToast('error', 'Operation failed. Please try again.');

// Info
showToast('info', 'Review details before proceeding.');
```

### Icon Usage
- Always use Lucide React icons (never emojis)
- Common icons:
  - `FileText` - Documents, invoices
  - `Building2` - Suppliers, companies
  - `Calendar` - Dates
  - `DollarSign` - Financial amounts
  - `Search` - Search functionality
  - `Filter` - Filters
  - `Plus` - Create new
  - `ArrowLeft` - Back navigation
  - `Loader2` - Loading states
  - `CheckCircle2` - Success
  - `XCircle` - Error/Reject
  - `Send` - Submit/Action

---

## Component Guidelines

### Buttons

#### Primary Button
```typescript
className="bg-wujha-primary text-white hover:bg-wujha-primary-hover focus:ring-wujha-primary"
```

#### Secondary Button
```typescript
className="border border-gray-300 text-gray-700 hover:bg-gray-50"
```

#### Icon Button
```typescript
className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
```

### Inputs

#### Text Input
```typescript
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors"
```

#### Select/Dropdown
```typescript
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
```

#### Textarea
```typescript
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors"
```

### Cards
```typescript
<Card>
  <div className="p-6">
    {/* Content */}
  </div>
</Card>
```

### Tables
- Header: `bg-gray-50 border-b border-gray-200`
- Rows: `hover:bg-gray-50`
- Cells: `px-6 py-4 whitespace-nowrap`
- Text: `text-sm text-gray-900` or `text-sm font-medium text-wujha-primary`

---

## Best Practices

1. **Consistency**: Always use wujha-primary for primary actions
2. **Accessibility**: Include proper labels, ARIA attributes, and keyboard navigation
3. **Loading States**: Show loading indicators for all async operations
4. **Error Handling**: Display user-friendly error messages with recovery actions
5. **Responsive Design**: Use responsive grid layouts (`md:grid-cols-2`, `lg:grid-cols-3`)
6. **Empty States**: Provide helpful empty states with CTAs
7. **Validation**: Validate forms both client-side and server-side
8. **Toast Notifications**: Use toast notifications for user feedback (never `alert()`)
9. **Icons**: Use Lucide React icons consistently
10. **Spacing**: Maintain consistent spacing using Tailwind's spacing scale

---

## Quick Reference

### Color Classes
- Primary: `bg-wujha-primary`, `text-wujha-primary`, `border-wujha-primary`
- Primary Hover: `hover:bg-wujha-primary-hover`
- Focus: `focus:ring-wujha-primary`, `focus:border-wujha-primary`
- Disabled: `bg-wujha-primary/60`
- Accent: `border-wujha-primary/20`, `bg-wujha-primary/10`

### Common Spacing
- Container padding: `p-6`
- Card padding: `p-6`
- Section margin: `mb-6`
- Gap between items: `gap-4` or `gap-6`

### Common Layouts
- Page container: `container mx-auto p-6`
- Two-column grid: `grid grid-cols-1 md:grid-cols-2 gap-6`
- Three-column grid: `grid grid-cols-1 md:grid-cols-3 gap-6`
- Four-column grid: `grid grid-cols-1 md:grid-cols-4 gap-4`

---

*Last Updated: Based on current codebase patterns*

