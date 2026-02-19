'use client';

import { useRef, useState } from 'react';
import { Download, ExternalLink, FileText, Trash2, UploadCloud } from 'lucide-react';

type DocumentItem = {
  id: string;
  documentName: string;
  fileSize: number;
  uploadedAt: string;
};

type DocumentManagerProps = {
  documents: DocumentItem[];
  uploading: boolean;
  onUpload: (file: File | null) => Promise<void> | void;
  onDelete: (documentId: string) => Promise<void> | void;
  getViewUrl: (documentId: string) => string;
  getDownloadUrl: (documentId: string) => string;
};

export default function DocumentManager({
  documents,
  uploading,
  onUpload,
  onDelete,
  getViewUrl,
  getDownloadUrl,
}: DocumentManagerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file || uploading) return;
    await onUpload(file);
  };

  return (
    <div className="space-y-6">
      <div
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          isDragOver
            ? 'border-wujha-primary bg-wujha-primary/5'
            : 'border-wujha-primary/40 bg-white hover:border-wujha-primary/70'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          void handleFile(e.dataTransfer.files?.[0] || null);
        }}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-wujha-primary/10">
          <UploadCloud className="h-7 w-7 text-wujha-primary" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Upload Documents</h3>
        <p className="mt-1 text-sm text-gray-600">Drag and drop files here, or browse from your device.</p>
        <div className="mt-2 text-xs text-gray-500">PDF, DOCX, XLSX, JPG, PNG</div>
        <div className="mt-5">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-md bg-wujha-primary px-4 py-2 text-sm font-medium text-white hover:bg-wujha-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UploadCloud className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Choose File'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              void handleFile(e.target.files?.[0] || null);
              e.currentTarget.value = '';
            }}
          />
        </div>
      </div>

      {documents.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Document</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Uploaded</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Size</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-wujha-primary" />
                      <span className="text-sm font-medium text-gray-900">{doc.documentName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{new Date(doc.uploadedAt).toLocaleString()}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{(doc.fileSize / 1024).toFixed(1)} KB</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={getViewUrl(doc.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        View
                      </a>
                      <a
                        href={getDownloadUrl(doc.id)}
                        download={doc.documentName}
                        className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Download className="mr-1 h-3.5 w-3.5" />
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={() => void onDelete(doc.id)}
                        className="inline-flex items-center rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          <p className="text-sm text-gray-600">No documents uploaded yet.</p>
        </div>
      )}
    </div>
  );
}
