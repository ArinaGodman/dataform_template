// File contains general functions used across most of the

// Function to sanitize column names by replacing dots with underscores
function sanitizeColumnName(columnName) {
    return columnName.replace(/\./g, '_');
}

// Function to map standard column names to their corresponding mapped names
function mapColumnName(standardName, columnMappings) {
    return columnMappings[standardName] || standardName;
}

function generateSelectColumns(stagedColumns, columnMappings, columnsToExtract) {
    let eventNameColumn = '';
    const otherColumns = stagedColumns.map(column => {
        const mappedName = mapColumnName(column.name, columnMappings);
        if (mappedName === 'event_name') {
            eventNameColumn = column.name;
            return null; 
        }
        
        // Check all nested fields in columnsToExtract
        for (const [nestedField, params] of Object.entries(columnsToExtract)) {
            const paramColumn = params.find(c => c.name === mappedName);
            if (paramColumn) {
                if (nestedField === 'event_params') {
                    return `(SELECT value.${paramColumn.type} FROM UNNEST(event_params) WHERE key = '${mappedName}' LIMIT 1) AS ${column.name}`;
                } else if (nestedField === 'item.item_params') {
                    // For 'own_brand', convert to boolean
                    if (mappedName === 'own_brand') {
                        return `CAST(COALESCE((SELECT value.${paramColumn.type} FROM UNNEST((SELECT item_params FROM UNNEST(items) LIMIT 1)) WHERE key = '${mappedName}' LIMIT 1), 0) AS BOOL) AS ${column.name}`;
                    } else {
                        return `(SELECT value.${paramColumn.type} FROM UNNEST((SELECT item_params FROM UNNEST(items) LIMIT 1)) WHERE key = '${mappedName}' LIMIT 1) AS ${column.name}`;
                    }
                }
                // Add more conditions here for other types of nested fields if needed
            }
        }
        
        if (mappedName.includes('.')) {
            return `${mappedName} AS ${sanitizeColumnName(column.name)}`;
        }
        return `${mappedName} AS ${column.name}`;
    }).filter(Boolean);

    // Handle event_name column with hardcoded customized events logic
    let eventNameSelect = eventNameColumn ? `${mapColumnName('event_name', columnMappings)}` : '';
    
    // Check if page_location is available in columnsToExtract
    const pageLocationAvailable = columnsToExtract.event_params && columnsToExtract.event_params.some(c => c.name === 'page_location');

   // if (pageLocationAvailable) {
        // Customized events logic - only applied if page_location is available
      //  eventNameSelect = `CASE
       //     WHEN (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') LIKE 'https://www.netonnet.se/checkout/customer' THEN 'enter_customer_information'
       //     WHEN (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') LIKE 'https://www.netonnet.se/checkout/confirmation' AND ${mapColumnName('event_name', columnMappings)} = 'page_view' THEN 'customer_confirmation'
       //     ELSE ${mapColumnName('event_name', columnMappings)}
       // END`;
   // }

    if (eventNameColumn) {
        eventNameSelect += ` AS ${eventNameColumn}`;
    }

    return [eventNameSelect, ...otherColumns].filter(Boolean).join(',\n  ');
}

// Function to generate final SQL SELECT columns with sanitization
function generateFinalSelectColumns(stagedColumns) {
    return stagedColumns.map(column => {
        // Check if the column name includes 'date'
        if (column.name.toLowerCase().includes('date')) {
            // Use PARSE_DATE to convert 'YYYYMMDD' format to DATE
            return `PARSE_DATE('%Y%m%d', CAST(${column.name} AS STRING)) AS ${sanitizeColumnName(column.name)}`;
        }
        // Sanitize column names that include a dot
        return column.name.includes('.') ? sanitizeColumnName(column.name) : column.name;
    }).join(',\n  ');
}

// Function to generate a filter for funnel stages
function generateFunnelStagesFilter(funnelStages) {
    return funnelStages.map(stage => `'${stage}'`).join(', ');
}

// Function to generate SQL filter conditions based on provided filters
function generateFilters(filters) {
    const filterConditions = Object.entries(filters)
        .filter(([_, values]) => Array.isArray(values) && values.length > 0)
        .map(([column, values]) => {
            const sanitizedColumn = sanitizeColumnName(column);
            const formattedValues = values.map(v => `'${v.trim()}'`).join(', ');
            return `${sanitizedColumn} IN (${formattedValues})`;
        });

    return filterConditions.length > 0 ? `AND ${filterConditions.join(' AND ')}` : '';
}


// Function to get the date of X days ago in YYYYMMDD format
function getDateDaysAgo(daysAgo) {
    const days = parseInt(daysAgo, 10);
    const today = new Date();
    const pastDate = new Date(today.setDate(today.getDate() - days));
    return pastDate.toISOString().slice(0, 10);
}

function getDateGrouping(dateColumn, granularity) {
  switch (granularity.toLowerCase()) {
    case 'weekly':
      return `DATE_TRUNC(${dateColumn}, WEEK)`;
    case 'monthly':
      return `DATE_TRUNC(${dateColumn}, MONTH)`;
    case 'daily':
    default:
      return `${dateColumn}`;  // No need to parse, just return the column as is
  }
}

function getPreviousMonthRange() {
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  const formatDate = (date) => date.toISOString().slice(0, 10).replace(/-/g, '');

  return {
    start: formatDate(startOfLastMonth),
    end: formatDate(endOfLastMonth)
  };
}
// Export functions for reuse
module.exports = {
    sanitizeColumnName,
    mapColumnName,
    generateSelectColumns,
    generateFinalSelectColumns,
    generateFunnelStagesFilter,
    generateFilters,
    getDateDaysAgo,
    getDateGrouping,
    getPreviousMonthRange
};
