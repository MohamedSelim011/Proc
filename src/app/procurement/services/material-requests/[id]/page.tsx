'use client';

import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function MaterialRequestDetailPlaceholder() {
  return (
    <div className="p-6">
      <Link
        href="/procurement/services/material-requests"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Material Requests
      </Link>

      <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
        <FileText className="mx-auto mb-3 h-8 w-8 text-gray-400" />
        <h1 className="text-xl font-semibold text-gray-900">Material Request Details</h1>
        <p className="mt-2 text-sm text-gray-600">
          Details screen will be implemented in the next phase of the requisition domain refactor.
        </p>
      </div>
    </div>
  );
}

