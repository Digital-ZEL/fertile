'use client';

import { useState, useCallback, useRef } from 'react';
import {
  parseFFCSV,
  getCSVPreview,
  validateCSVStructure,
  convertToObservations,
} from '@/lib/ff-import';
import { addObservations } from '@/lib/db';
import type { ImportResult, ParsedCSVRow } from '@/lib/types';

type ImportState = 'idle' | 'preview' | 'importing' | 'success' | 'error';

export default function ImportPage() {
  const [state, setState] = useState<ImportState>('idle');
  const [fileName, setFileName] = useState<string>('');
  const [preview, setPreview] = useState<ParsedCSVRow[]>([]);
  const [parseResult, setParseResult] = useState<ImportResult | null>(null);
  const [structureValid, setStructureValid] = useState<boolean>(true);
  const [missingCols, setMissingCols] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;

      // Validate structure
      const validation = validateCSVStructure(content);
      setStructureValid(validation.valid);
      setMissingCols(validation.missingColumns);

      // Get preview
      const previewData = getCSVPreview(content, 10);
      setPreview(previewData);

      // Parse full content
      const result = parseFFCSV(content);
      setParseResult(result);

      setState('preview');
    };

    reader.onerror = () => {
      alert('Error reading file');
    };

    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleImport = async () => {
    if (!parseResult || !parseResult.success) {
      return;
    }

    setState('importing');

    try {
      // Convert raw FF observations to app observation format
      const observations = convertToObservations(parseResult.observations);

      // Save to IndexedDB
      const saved = await addObservations(observations);
      setImportedCount(saved.length);
      setState('success');
    } catch (error) {
      console.error('Import error:', error);
      setState('error');
    }
  };

  const handleReset = () => {
    setState('idle');
    setFileName('');
    setPreview([]);
    setParseResult(null);
    setStructureValid(true);
    setMissingCols([]);
    setImportedCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Import Data</h1>
      <p className="mb-8 text-gray-600">Import your data from Fertility Friend CSV export</p>

      {/* Upload Zone */}
      {state === 'idle' && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
            isDragging
              ? 'border-pink-500 bg-pink-50'
              : 'border-pink-200 bg-white hover:border-pink-400 hover:bg-pink-50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            accept=".csv"
            className="hidden"
          />
          <div className="mb-4 text-5xl">📁</div>
          <p className="mb-2 text-lg font-medium text-gray-900">
            {isDragging ? 'Drop your file here' : 'Drag & drop your CSV file here'}
          </p>
          <p className="text-sm text-gray-500">or click to browse</p>
          <p className="mt-4 text-xs text-gray-400">Supports Fertility Friend CSV exports</p>
        </div>
      )}

      {/* Preview State */}
      {state === 'preview' && parseResult && (
        <div className="space-y-6">
          {/* File Info */}
          <div className="rounded-lg bg-pink-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="font-medium text-gray-900">{fileName}</p>
                  <p className="text-sm text-gray-600">
                    {parseResult.observations.length} days of data found
                  </p>
                </div>
              </div>
              <button onClick={handleReset} className="text-sm text-gray-500 hover:text-gray-700">
                Change file
              </button>
            </div>
          </div>

          {/* Structure Warning */}
          {!structureValid && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="font-medium text-yellow-800">Missing Required Columns</p>
                  <p className="text-sm text-yellow-700">
                    The following columns are required: {missingCols.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Errors */}
          {parseResult.errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex gap-3">
                <span className="text-xl">❌</span>
                <div>
                  <p className="font-medium text-red-800">
                    {parseResult.errors.length} Error{parseResult.errors.length > 1 ? 's' : ''}{' '}
                    Found
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-red-700">
                    {parseResult.errors.slice(0, 5).map((error, i) => (
                      <li key={i}>
                        Row {error.row}: {error.message}
                      </li>
                    ))}
                    {parseResult.errors.length > 5 && (
                      <li className="text-red-600">
                        ...and {parseResult.errors.length - 5} more errors
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {parseResult.warnings.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="font-medium text-yellow-800">
                    {parseResult.warnings.length} Warning
                    {parseResult.warnings.length > 1 ? 's' : ''}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-yellow-700">
                    {parseResult.warnings.slice(0, 3).map((warning, i) => (
                      <li key={i}>
                        {warning.row > 0 ? `Row ${warning.row}: ` : ''}
                        {warning.message}
                      </li>
                    ))}
                    {parseResult.warnings.length > 3 && (
                      <li className="text-yellow-600">
                        ...and {parseResult.warnings.length - 3} more warnings
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {preview.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-pink-100 bg-white">
              <div className="border-b border-pink-100 bg-pink-50 px-4 py-3">
                <h3 className="font-medium text-gray-900">Preview (first 10 rows)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(preview[0])
                        .slice(0, 6)
                        .map((header) => (
                          <th
                            key={header}
                            className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                          >
                            {header}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {preview.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {Object.keys(row)
                          .slice(0, 6)
                          .map((key) => (
                            <td
                              key={key}
                              className="whitespace-nowrap px-4 py-3 text-sm text-gray-900"
                            >
                              {row[key] || '-'}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Button */}
          <div className="flex gap-4">
            <button
              onClick={handleImport}
              disabled={!parseResult.success}
              className={`flex-1 rounded-lg px-6 py-3 font-medium text-white transition-colors ${
                parseResult.success
                  ? 'bg-pink-600 hover:bg-pink-700'
                  : 'cursor-not-allowed bg-gray-400'
              }`}
            >
              Import {parseResult.observations.length} Days of Data
            </button>
            <button
              onClick={handleReset}
              className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Importing State */}
      {state === 'importing' && (
        <div className="rounded-2xl border border-pink-100 bg-white p-12 text-center">
          <div className="mb-4 animate-pulse text-5xl">⏳</div>
          <p className="text-lg font-medium text-gray-900">Importing your data...</p>
          <p className="mt-2 text-gray-500">This may take a moment</p>
        </div>
      )}

      {/* Success State */}
      {state === 'success' && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-12 text-center">
          <div className="mb-4 text-5xl">✅</div>
          <p className="text-lg font-medium text-gray-900">Import Complete!</p>
          <p className="mt-2 text-gray-600">
            Successfully imported {importedCount} observation{importedCount !== 1 ? 's' : ''}
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <a
              href="/dashboard"
              className="rounded-lg bg-pink-600 px-6 py-3 font-medium text-white transition-colors hover:bg-pink-700"
            >
              View Dashboard
            </a>
            <button
              onClick={handleReset}
              className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Import More
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {state === 'error' && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
          <div className="mb-4 text-5xl">❌</div>
          <p className="text-lg font-medium text-gray-900">Import Failed</p>
          <p className="mt-2 text-gray-600">
            There was an error saving your data. Please try again.
          </p>
          <button
            onClick={handleReset}
            className="mt-6 rounded-lg bg-pink-600 px-6 py-3 font-medium text-white transition-colors hover:bg-pink-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Help Section */}
      {state === 'idle' && (
        <div className="mt-8 rounded-lg border border-pink-100 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            How to Export from Fertility Friend
          </h2>
          <ol className="space-y-3 text-gray-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-pink-100 text-sm font-medium text-pink-600">
                1
              </span>
              <span>Open the Fertility Friend app or website</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-pink-100 text-sm font-medium text-pink-600">
                2
              </span>
              <span>
                Go to <strong>Settings</strong> → <strong>Data</strong> →{' '}
                <strong>Export/Backup</strong>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-pink-100 text-sm font-medium text-pink-600">
                3
              </span>
              <span>
                Select <strong>CSV Export</strong> and download the file
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-pink-100 text-sm font-medium text-pink-600">
                4
              </span>
              <span>Upload the CSV file here</span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
