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

    if (pageLocationAvailable) {
        // Customized events logic - only applied if page_location is available
        eventNameSelect = `CASE
            WHEN (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') LIKE 'https://www.netonnet.se/checkout/customer' THEN 'enter_customer_information'
            WHEN (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') LIKE 'https://www.netonnet.se/checkout/confirmation' AND ${mapColumnName('event_name', columnMappings)} = 'page_view' THEN 'customer_confirmation'
            ELSE ${mapColumnName('event_name', columnMappings)}
        END`;
    }

    if (eventNameColumn) {
        eventNameSelect += ` AS ${eventNameColumn}`;
    }

    return [eventNameSelect, ...otherColumns].filter(Boolean).join(',\n  ');
}

// Function to generate final SQL SELECT columns with sanitization
function generateFinalSelectColumns(stagedColumns) {
    return stagedColumns.map(column =>
        column.name.includes('.') ? sanitizeColumnName(column.name) : column.name
    ).join(',\n  ');
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


// (NOT USED) Function to get the date of X days ago in YYYYMMDD format 
function getDateDaysAgo(daysAgo) {
    const days = parseInt(daysAgo, 10);
    const today = new Date();
    const pastDate = new Date(today.setDate(today.getDate() - days));
    return pastDate.toISOString().slice(0, 10).replace(/-/g, "");
}

function getIncrementalDateRange(granularity, daysAgo) {
    const currentDate = new Date();
    const latestDataDate = new Date(currentDate);
    latestDataDate.setDate(latestDataDate.getDate() - daysAgo);
    
    let startDate, endDate;

    switch(granularity) {
        case 'daily':
            startDate = endDate = formatDate(latestDataDate);
            break;
        case 'weekly':
            // Find the most recent completed ISO week
            endDate = new Date(currentDate);
            endDate.setDate(currentDate.getDate() - ((currentDate.getDay() + 6) % 7) - 1); // Last Sunday
            startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - 6); // Monday of the same week
            
            // Ensure we're not fetching data beyond latestDataDate
            if (endDate > latestDataDate) {
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() - 1); // Previous Sunday
                startDate.setDate(startDate.getDate() - 7); // Previous Monday
            }
            
            startDate = formatDate(startDate);
            endDate = formatDate(endDate);
            break;
        case 'monthly':
            // Get the first and last day of the previous month
            endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
            startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
            
            // Ensure we're not fetching data beyond latestDataDate
            if (endDate > latestDataDate) {
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() - 1);
                startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
            }
            
            startDate = formatDate(startDate);
            endDate = formatDate(endDate);
            break;
        default:
            throw new Error('Invalid granularity');
    }

    return { startDate, endDate };
}

function formatDate(date) {
    return date.toISOString().split('T')[0].replace(/-/g, '');
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
    getIncrementalDateRange,
    formatDate
};
