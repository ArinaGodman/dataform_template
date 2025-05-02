// Import necessary functions from general_functions.js
const {
    sanitizeColumnName,
    mapColumnName
} = require('./general_functions.js');

// Funnel-specific functions


// Generates CTEs for each funnel stage
function generateStageCTEs(stages, dimensions, columnMappings, funnelType) {
    const idColumn = funnelType === 'session' ? 'ga_session_id' : 'user_id';

    return stages.map((stage, index) => {
        let baseSelect = `
${sanitizeColumnName(mapColumnName('date', columnMappings))} AS event_date,
${dimensions.map(dim => `${sanitizeColumnName(mapColumnName(dim, columnMappings))}`).join(', ')}
${dimensions.length > 0 ? ',' : ''}
${mapColumnName(idColumn, columnMappings)} AS step${index + 1}_id,
${mapColumnName('timestamp', columnMappings)} AS step${index + 1}_timestamp`;

        // Add purchase_revenue and item_quantity for the last stage (assumed to be 'purchase')
        if (index === stages.length - 1) {
            baseSelect += `,
purchase_revenue,
total_quantity`;
        }

        return `
cte_step${index + 1} AS (
SELECT
${baseSelect}
FROM source_data
WHERE ${mapColumnName('event_name', columnMappings)} = '${stage}'
)`;
    }).join(',\n');
}

// Generates the final funnel query
function generateFunnelQuery(stages, dimensions, columnMappings, funnelType) {
    const idColumn = funnelType === 'session' ? 'session_id' : 'user_id';
    
    return stages.map((stage, index) => `
SELECT
  '${stage}' AS event_name,
  cte_step1.event_date,
  ${dimensions.map(dim => `cte_step1.${sanitizeColumnName(mapColumnName(dim, columnMappings))}`).join(',\n  ')}
  ${dimensions.length > 0 ? ',' : ''}
  COUNT(DISTINCT cte_step${index + 1}.step${index + 1}_id) AS event_count,
  ${index === stages.length - 1 ? `
  SUM(cte_step${index + 1}.purchase_revenue) AS total_revenue,
  SUM(cte_step${index + 1}.total_quantity) AS total_item_quantity` : `
  0 AS total_revenue,
  0 AS total_item_quantity`}
FROM cte_step1
${stages.slice(1, index + 1).map((_, i) => `
LEFT JOIN cte_step${i + 2} ON cte_step1.event_date = cte_step${i + 2}.event_date
  ${dimensions.map(dim => `AND cte_step1.${sanitizeColumnName(mapColumnName(dim, columnMappings))} = cte_step${i + 2}.${sanitizeColumnName(mapColumnName(dim, columnMappings))}`).join('\n  ')}
  AND cte_step${i + 1}.step${i + 1}_id = cte_step${i + 2}.step${i + 2}_id
  AND cte_step${i + 1}.step${i + 1}_timestamp < cte_step${i + 2}.step${i + 2}_timestamp`).join('')}
GROUP BY
  cte_step1.event_date
  ${dimensions.length > 0 ? ', ' + dimensions.map(dim => `cte_step1.${sanitizeColumnName(mapColumnName(dim, columnMappings))}`).join(', ') : ''}
`).join('\nUNION ALL\n');
}
// Generates SQL for summing up the number of users/sessions that completed each funnel stage
function generateStageSums(stages) {
    return stages.map((stage, index) =>
        `SUM(stage_${index}) AS ${sanitizeColumnName(stage)}`
    ).join(',\n  ');
}

// Export the funnel-specific functions
module.exports = {
    generateStageCTEs,
    generateStageSums,
    generateFunnelQuery
};

