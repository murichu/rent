/**
 * CSV Export/Import Utilities
 */

/**
 * Convert array of objects to CSV string
 */
export function convertToCSV(data, columns = null) {
  if (!data || data.length === 0) {
    return '';
  }

  // Use provided columns or extract from first object
  const headers = columns || Object.keys(data[0]);
  
  // Create header row
  const headerRow = headers.join(',');
  
  // Create data rows
  const dataRows = data.map(item => {
    return headers.map(header => {
      const value = item[header];
      
      // Handle different data types
      if (value === null || value === undefined) {
        return '';
      }
      
      // Convert to string and escape quotes
      let stringValue = String(value);
      
      // Wrap in quotes if contains comma, newline, or quotes
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        stringValue = `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    }).join(',');
  });
  
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(data, filename = 'export.csv', columns = null) {
  try {
    const csv = convertToCSV(data, columns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error downloading CSV:', error);
    return false;
  }
}

/**
 * Export properties to CSV
 */
export function exportProperties(properties) {
  const columns = [
    'id',
    'title',
    'address',
    'city',
    'state',
    'zip',
    'bedrooms',
    'bathrooms',
    'sizeSqFt',
    'rentAmount',
    'status',
    'type'
  ];
  
  const filename = `properties_${new Date().toISOString().split('T')[0]}.csv`;
  return downloadCSV(properties, filename, columns);
}

/**
 * Export tenants to CSV
 */
export function exportTenants(tenants) {
  const columns = [
    'id',
    'name',
    'email',
    'phone',
    'averageRating',
    'isHighRisk',
    'createdAt'
  ];
  
  const filename = `tenants_${new Date().toISOString().split('T')[0]}.csv`;
  return downloadCSV(tenants, filename, columns);
}

/**
 * Export leases to CSV
 */
export function exportLeases(leases) {
  const columns = [
    'id',
    'propertyId',
    'tenantId',
    'startDate',
    'endDate',
    'rentAmount',
    'paymentDayOfMonth'
  ];
  
  const filename = `leases_${new Date().toISOString().split('T')[0]}.csv`;
  return downloadCSV(leases, filename, columns);
}

/**
 * Export payments to CSV
 */
export function exportPayments(payments) {
  const columns = [
    'id',
    'leaseId',
    'amount',
    'paidAt',
    'method',
    'referenceNumber',
    'notes'
  ];
  
  const filename = `payments_${new Date().toISOString().split('T')[0]}.csv`;
  return downloadCSV(payments, filename, columns);
}

/**
 * Parse CSV string to array of objects
 */
export function parseCSV(csvString) {
  const lines = csvString.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return [];
  }
  
  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length === headers.length) {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      data.push(obj);
    }
  }
  
  return data;
}

/**
 * Parse a single CSV line (handles quoted values)
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current);
  
  return result;
}

/**
 * Read CSV file from input
 */
export function readCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvString = e.target.result;
        const data = parseCSV(csvString);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Validate CSV data against schema
 */
export function validateCSVData(data, requiredFields = []) {
  const errors = [];
  
  if (!data || data.length === 0) {
    errors.push('CSV file is empty');
    return { valid: false, errors };
  }
  
  // Check required fields
  const firstRow = data[0];
  const missingFields = requiredFields.filter(field => !(field in firstRow));
  
  if (missingFields.length > 0) {
    errors.push(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    data
  };
}
