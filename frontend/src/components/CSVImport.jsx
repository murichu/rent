import React, { useState, useRef } from 'react';
import { readCSVFile, validateCSVData } from '../utils/csvExport';

/**
 * CSV Import Component
 * Allows users to import data from CSV files
 */
const CSVImport = ({ 
  onImport, 
  requiredFields = [],
  entityType = 'items',
  acceptedFormats = '.csv',
  maxFileSize = 5 * 1024 * 1024 // 5MB
}) => {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      return;
    }

    // Validate file size
    if (selectedFile.size > maxFileSize) {
      setError(`File size exceeds maximum of ${maxFileSize / 1024 / 1024}MB`);
      return;
    }

    // Validate file type
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setImportStatus(null);

    // Read and preview file
    try {
      const data = await readCSVFile(selectedFile);
      const validation = validateCSVData(data, requiredFields);
      
      if (!validation.valid) {
        setError(validation.errors.join(', '));
        setPreview(null);
        return;
      }

      setPreview(data.slice(0, 5)); // Show first 5 rows
    } catch (err) {
      setError('Failed to read CSV file: ' + err.message);
      setPreview(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await readCSVFile(file);
      const validation = validateCSVData(data, requiredFields);
      
      if (!validation.valid) {
        setError(validation.errors.join(', '));
        setIsLoading(false);
        return;
      }

      // Call the import callback
      const result = await onImport(data);
      
      setImportStatus({
        success: true,
        count: data.length,
        message: result?.message || `Successfully imported ${data.length} ${entityType}`
      });

      // Clear file after successful import
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError('Failed to import data: ' + err.message);
      setImportStatus({
        success: false,
        message: err.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setImportStatus(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4" role="region" aria-label="CSV Import">
      {/* File Input */}
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats}
          onChange={handleFileSelect}
          className="hidden"
          id="csv-file-input"
          aria-label="Select CSV file"
        />
        <label
          htmlFor="csv-file-input"
          className="cursor-pointer flex flex-col items-center space-y-3"
        >
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <div>
            <span className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              Click to upload
            </span>
            <span className="text-gray-600 dark:text-gray-400"> or drag and drop</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            CSV file up to {maxFileSize / 1024 / 1024}MB
          </p>
          {file && (
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Selected: {file.name}
            </p>
          )}
        </label>
      </div>

      {/* Required Fields Info */}
      {requiredFields.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Required Fields:
          </h4>
          <div className="flex flex-wrap gap-2">
            {requiredFields.map(field => (
              <span
                key={field}
                className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 text-sm rounded"
              >
                {field}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4" role="alert">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {importStatus?.success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4" role="status">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-green-800 dark:text-green-200">{importStatus.message}</p>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {preview && preview.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Preview (first {preview.length} rows)
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {Object.keys(preview[0]).map(key => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {preview.map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row).map((value, colIdx) => (
                      <td
                        key={colIdx}
                        className="px-4 py-3 text-gray-900 dark:text-gray-100"
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {file && (
        <div className="flex space-x-3">
          <button
            onClick={handleImport}
            disabled={isLoading || !!error}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            aria-label={`Import ${entityType}`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Importing...
              </span>
            ) : (
              `Import ${entityType}`
            )}
          </button>
          <button
            onClick={handleClear}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            aria-label="Clear selection"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default CSVImport;
