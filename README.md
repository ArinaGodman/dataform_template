# Dataform Funnel Analysis Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Configuration](#configuration)
   - [Required Variables](#required-variables)
   - [Core Configuration](#core-configuration)
   - [Data Source Configuration](#data-source-configuration)
   - [Funnel Configuration](#funnel-configuration)
   - [Date Range Configuration](#date-range-configuration)
   - [Data Extraction Configuration](#data-extraction-configuration)
   - [Filtering Configuration](#filtering-configuration)
   - [Column Configuration](#column-configuration)
   - [Customization Note](#customization-note)
   - [Example Configuration](#example-configuration)
3. [Data Pipeline Structure](#data-pipeline-structure)
   - [Data Extraction](#data-extraction)
   - [Data Staging](#data-staging)
   - [Funnel Table Generation](#funnel-table-generation)
     - [Open User Funnel](#open-user-funnel)
     - [Open Session Funnel](#open-session-funnel)
     - [Closed User Funnel](#closed-user-funnel)
     - [Closed Session Funnel](#closed-session-funnel)
   - [Data Aggregation](#data-aggregation)
   - [Incremental Processing](#incremental-processing)
4. [Funnel Stages](#funnel-stages)
   - [Defining Funnel Stages](#defining-funnel-stages)
   - [Available Event Types](#available-event-types)
   - [Custom Events](#custom-events)
5. [Granularity Options](#granularity-options)
   - [Available Granularity Levels](#available-granularity-levels)
   - [How Granularity Affects Data Processing](#how-granularity-affects-data-processing)
   - [Configuring Granularity](#configuring-granularity)
   - [Best Practices](#best-practices)
6. [Custom Functions](#custom-functions)
   - [General Functions](#general-functions)
   - [Funnel-Specific Functions](#funnel-specific-functions)
   - [Customization and Extension](#customization-and-extension)
   - [Best Practices](#best-practices)
7. [Usage Examples](#usage-examples)
8. [Troubleshooting](#troubleshooting)

## Introduction

This project offers a flexible and efficient template for creating a data pipeline in Dataform to process Google Analytics 4 (GA4) data for e-commerce funnel analysis. The pipeline generates optimized tables specifically designed for visualizing e-commerce funnels, providing a powerful tool for businesses to analyze and optimize their online sales processes.

Key features and benefits of this template include:

1. **Customizable Event Tracking**: The template allows for the inclusion of customized events as stages in your funnel, even if these events weren't specifically tracked in GA4. This flexibility enables more detailed and relevant funnel analysis tailored to your business needs.

2. **Efficient Data Processing**: Instead of querying the entire GA4 dataset for funnel analysis, this pipeline processes only the necessary data, significantly reducing computation time and costs.

3. **Flexible Date Granularity**: Data can be fetched and processed on a daily, weekly, or monthly basis, depending on the requirements of your project. This adaptability allows for both detailed short-term analysis and broader long-term trend identification.

4. **Easy Customization**: The template is designed to be easily adaptable to specific company needs with minimal adjustments, primarily through configuration in the `workflow_settings.yaml` file and minor tweaks to JavaScript functions.

5. **Incremental Loading**: The pipeline supports incremental data loading, ensuring that only new or updated data is processed in each run, further optimizing performance and resource usage.

By leveraging this template, businesses can quickly set up a robust GA4 data pipeline for e-commerce funnel analysis, gaining valuable insights into customer behavior and conversion paths with minimal development effort.

## Configuration
Navigate to a file workflow_settings.yaml where you can configure your project for a specific client. Some adjustments may be needed to add customized events within `funnel_functions.js`. 

** This needs to be updated in the future**

## Required Variables

The following variables must be configured in the `workflow_settings.yaml` file for each project. These settings determine the data source, funnel stages, granularity, and other crucial aspects of the pipeline.

### Core Configuration
- `defaultProject`: The default Google Cloud project (e.g., "conversionista-se")
- `defaultLocation`: The default location for BigQuery datasets (e.g., "EU")
- `defaultDataset`: The dataset where Dataform will write its output (e.g., "dataform_funnels")
- `dataformCoreVersion`: The version of Dataform core to use (e.g., "3.0.0")

### Data Source Configuration
- `sourceDataset`: The GA4 dataset to query (e.g., "analytics_440541972")
- `sourceTable`: The table pattern for GA4 events (e.g., "events_*")

### Funnel Configuration
- `funnelStages`: A comma-separated list of event names that define your funnel stages (e.g., "page_view, menu_navigation, blog_card_click"). Funnels should be written in the correct order.
- `granularity`: The time granularity for data processing ("daily", "weekly", or "monthly")
- `dimensions`: Additional dimensions to include in the analysis (e.g., "own_brand" or leave empty for no additional dimensions)

### Date Range Configuration
- `dateRangeStart`: The start date for full data loads (format: "YYYYMMDD")
- `dateRangeEnd`: The end date for full data loads (format: "YYYYMMDD")
- `daysAgo`: Number of days ago to fetch data for incremental loads (e.g., "1" for yesterday's data). This is used in case GA4 data comes a few days after it was tracked.

### Data Extraction Configuration
- `columnsToExtract`: A JSON object defining nested fields to extract from GA4 data
  - `event_params`: Array of event parameters to extract
  - `item.item_params`: Array of item-level parameters to extract

### Filtering Configuration
- `filters`: A JSON object for defining additional data filters (e.g., by country or device category)

### Dimension Configuration
- `dimension`: A JSON object for defining additional dimensions doe your funnels.

**OBS!** Don't forget to add both filters and dimentions to variable `stagedColumns`

### Column Configuration
- `stagedColumns`: A JSON array defining the columns to be included in the staged data, including their names and descriptions
- `columnMappings`: A JSON object mapping standard column names to their corresponding GA4 field names. Your names to the right!

### Customization Note
To add customized events (those not specifically tracked in GA4), modify the `generateSelectColumns` function in `general_functions.js`.

Example configuration for `funnelStages`:
```yaml
funnelStages: "page_view, menu_navigation, blog_card_click"

### Example Configuration
```json
{
  "vars": {
    "granularity": "weekly",
    "daysAgo": 1,
    // Add other configuration variables
  }
}
```
## Data Pipeline Structure

The data pipeline in this project processes Google Analytics 4 (GA4) data to create four different funnel analysis tables. The pipeline consists of the following stages:

1. **Data Extraction**
   - Source: GA4 data stored in BigQuery
   - Table: `${sourceDataset}.${sourceTable}` (e.g., `analytics_440541972.events_*`)
   - Process: Extracts relevant events and parameters based on configuration

2. **Data Staging**
   - Table: `staged_data`
   - Process: 
     - Applies initial filtering based on date range and funnel stages
     - Extracts nested fields as specified in `columnsToExtract`
     - Applies custom event definitions if configured
     - Handles data type conversions and column renaming

3. **Funnel Table Generation**
   The staged data is then used to create four different funnel analysis tables:

   a. **Open User Funnel**
      - Table: `open_user_funnel`
      - Description: Tracks unique users through each stage of the funnel, regardless of session

   b. **Open Session Funnel**
      - Table: `open_session_funnel`
      - Description: Tracks unique sessions through each stage of the funnel

   c. **Closed User Funnel**
      - Table: `closed_user_funnel`
      - Description: Tracks users who complete all stages of the funnel in order

   d. **Closed Session Funnel**
      - Table: `closed_session_funnel`
      - Description: Tracks sessions that complete all stages of the funnel in order

Each of these funnel tables is generated using the same staged data but with different logic to represent various aspects of user behavior and funnel progression.

4. **Data Aggregation**
   - Process: Aggregates data based on the specified granularity (daily, weekly, or monthly)
   - Applies dimension grouping if additional dimensions are specified

5. **Incremental Processing**
   - For subsequent runs, only processes new or updated data based on the `daysAgo` parameter
   - Ensures efficient processing and up-to-date funnel analysis

The resulting tables can be directly used for visualization and analysis, providing a comprehensive view of the e-commerce funnel from different perspectives (user vs. session, open vs. closed funnels).


## Funnel Stages

Funnel stages represent the key steps in your e-commerce conversion process. This template allows for flexible definition and customization of these stages to match your specific business needs.

### Defining Funnel Stages

Funnel stages are defined in the `workflow_settings.yaml` file using the `funnelStages` variable. Stages should be listed in the order they typically occur in the customer journey.

Example:
```yaml
funnelStages: "page_view, menu_navigation, blog_card_click, add_to_cart, begin_checkout, purchase"
```
### Available Event types

The following event types are commonly used in e-commerce funnels:

- page_view: User views a page
- view_item: User views a product
- add_to_cart: User adds a product to their cart
- begin_checkout: User starts the checkout process
- purchase: User completes a purchase

You can use any event that is tracked in your GA4 implementation.

### Custom Events

This template supports the use of custom events as funnel stages. To include a custom event:

1. Add the custom event name to the funnelStages list in workflow_settings.yaml.
2. Modify the generateSelectColumns function in general_functions.js to properly identify and extract the custom event.

Example of adding a custom event:
```yaml
funnelStages: "page_view, custom_event, add_to_cart, purchase"
```

Example code to define custom event in function `fenerateSelectColumn` in `general_functions.js`. In this case event is customized based on URL:

```yaml
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
```

## Granularity Options

Granularity options in this template allow you to control the time intervals at which data is processed and analyzed. This flexibility enables you to tailor the data pipeline to meet specific reporting and analysis needs, whether you're interested in daily trends, weekly patterns, or monthly summaries.

### Available Granularity Levels

1. **Daily Granularity**
   - **Description**: Processes data on a day-by-day basis.
   - **Use Case**: Ideal for detailed analysis of daily trends, such as monitoring daily sales, traffic fluctuations, or user engagement.
   - **Configuration**: Set `granularity` to `"daily"` in the `workflow_settings.yaml` file.

2. **Weekly Granularity**
   - **Description**: Aggregates data into ISO weeks, running from Monday to Sunday.
   - **Use Case**: Useful for identifying weekly patterns, such as weekly sales cycles or user behavior trends.
   - **Configuration**: Set `granularity` to `"weekly"` in the `workflow_settings.yaml` file.

3. **Monthly Granularity**
   - **Description**: Compiles data into calendar months.
   - **Use Case**: Best for long-term analysis, such as monthly revenue reports or user retention studies.
   - **Configuration**: Set `granularity` to `"monthly"` in the `workflow_settings.yaml` file.

### How Granularity Affects Data Processing

- **Data Fetching**: The granularity setting determines the date range for data fetching. For example, weekly granularity will fetch data for complete weeks, while monthly granularity will fetch data for complete months.
- **Aggregation**: Data is aggregated according to the chosen granularity, affecting how metrics are calculated and reported.
- **Incremental Loading**: The granularity setting influences how incremental updates are processed, ensuring that only the relevant time periods are updated.

### Configuring Granularity

To configure granularity, update the `granularity` variable in your `workflow_settings.yaml` file:

```yaml
vars:
  granularity: "weekly"  # Options: "daily", "weekly", "monthly"
  ```

### Best practices

- **Align with Reporting Needs:** Choose a granularity that aligns with your reporting and analysis needs. For example, use daily granularity for detailed operational insights and monthly granularity for strategic planning.
- **Consider Data Volume:** Be mindful of data volume and processing time. Higher granularity (e.g., daily) may result in larger datasets and longer processing times.
- **Review Regularly:** Regularly review and adjust the granularity setting to ensure it continues to meet your business objectives.
By selecting the appropriate granularity, you can optimize your data pipeline for efficient processing and meaningful insights, tailored to your specific business requirements.



## Custom Functions

This template includes a set of custom JavaScript functions designed to enhance the flexibility and functionality of your data pipeline. These functions are used to manipulate data, generate SQL queries, and customize the behavior of the pipeline to meet specific business needs.

### General Functions

1. **sanitizeColumnName**
   - **Purpose**: Replaces dots in column names with underscores to ensure compatibility with SQL syntax.
   - **Usage**: Automatically applied to all column names during data processing.
   - **Funnel Usage**: Used across all funnel types (open user, open session, closed user, closed session) to ensure consistent column naming.

2. **mapColumnName**
   - **Purpose**: Maps standard column names to their corresponding names in the GA4 dataset.
   - **Usage**: Ensures that SQL queries reference the correct columns in the source data.
   - **Funnel Usage**: Used across all funnel types (open user, open session, closed user, closed session) to map column names correctly.

3. **getIncrementalDateRange**
   - **Purpose**: Calculates the date range for incremental data loading based on the specified granularity and `daysAgo`.
   - **Usage**: Ensures that only the relevant time periods are processed during incremental updates.
   - **Funnel Usage**: Used across all funnel types (open user, open session, closed user, closed session) to determine the date range for data fetching.

4. **generateSelectColumns**
   - **Purpose**: Generates the SQL SELECT statement for extracting specified columns from the source data.
   - **Usage**: Customizes which columns are extracted and how nested fields are handled, including custom event logic.
   - **Funnel Usage**: Not explicitly used in the provided funnel configurations, but typically used in the data staging process.

5. **generateFinalSelectColumns**
   - **Purpose**: Generates the final SQL SELECT statement for the output tables, applying necessary sanitization.
   - **Usage**: Ensures that the final output tables have the correct structure and column names.
   - **Funnel Usage**: Not explicitly used in the provided funnel configurations, but typically used in the final output stage.

6. **generateFunnelStagesFilter**
   - **Purpose**: Creates a SQL filter condition for the specified funnel stages.
   - **Usage**: Filters the source data to include only the events relevant to the defined funnel stages.
   - **Funnel Usage**: Not explicitly used in the provided funnel configurations, but typically used to filter data based on the defined stages.

7. **generateFilters**
   - **Purpose**: Generates additional SQL filter conditions based on user-defined criteria.
   - **Usage**: Allows for dynamic filtering of data based on dimensions such as country or device category.
   - **Funnel Usage**: Not explicitly used in the provided funnel configurations, but typically used to apply additional filters as needed.

8. **formatDate**
   - **Purpose**: Formats JavaScript Date objects into a string format suitable for SQL queries.
   - **Usage**: Standardizes date formatting across the pipeline.
   - **Funnel Usage**: Used whithin `getIncrementalDateRange`.

### Funnel-Specific Functions

1. **generateStageCTEs**
   - **Purpose**: Generates Common Table Expressions (CTEs) for each funnel stage.
   - **Usage**: Used to create intermediate tables for each stage of the funnel, facilitating complex funnel logic.
   - **Funnel Usage**: Used in closed funnels (both user and session) to ensure stages are completed in order.

2. **generateFunnelQuery**
   - **Purpose**: Generates the final SQL query for the funnel analysis.
   - **Usage**: Combines all stages into a single query, applying necessary joins and aggregations.
   - **Funnel Usage**: Used in closed funnels (both user and session) to produce the final analysis output.

### Customization and Extension

- **Adding New Functions**: You can add new functions to the `general_functions.js` or `funnel_functions.js` files to extend the template's capabilities. Ensure that new functions are properly documented and tested.
- **Modifying Existing Functions**: Existing functions can be modified to better suit your specific business requirements. Be cautious when making changes to ensure that they do not disrupt the overall pipeline logic.
- **Function Documentation**: Each function should include comments explaining its purpose, parameters, and return values to facilitate understanding and maintenance.

### Best Practices

- **Keep Functions Modular**: Design functions to perform a single task or operation. This makes them easier to understand, test, and reuse.
- **Document Thoroughly**: Provide clear documentation for each function, including examples of usage and any assumptions or limitations.
- **Test Extensively**: Test custom functions thoroughly to ensure they work as expected and handle edge cases gracefully.

By leveraging and customizing these functions, you can tailor the data pipeline to meet your specific analytical needs, ensuring that it remains flexible and adaptable as your business evolves.
