# ENS Open Ledger
## Overview

ENS Open Ledger is a platform designed to track and visualize DAO budgets, providing an intuitive understanding of fund allocation across various working group expenses through an interactive Sankey diagram. The platform enhances transparency and detail, making it a valuable tool for informed decision-making, monitoring your own funding, and analyzing competitor spending within the DAO ecosystem. The application is availible at [ens-ledger.app](ens-ledger.app).

Authors: 
Alex van de Sande ([contact](https://discuss.ens.domains/u/avsa/summary)).
Danch.eth ([contact](https://t.me/danch_quixote)).

## Features

- Visualize budgets over all-time or filter by specific periods (e.g. [2023Q4](https://ens-ledger.app/quarter/2023Q4)), working groups (e.g. [Ecosystem WG in 2022Q3](https://ens-ledger.app/quarter/2022Q3/Ecosystem)), or expense categories (e.g. [PG Small Grants in 2023](https://ens-ledger.app/year/2023/category/PG%20Small%20Grants))
- Export graphs in tabular or graphical formats
- Access detailed statistics on any contractor or expense category by clicking on a node
- Get instant transaction details by clicking on a link

## Structure

The most important elements of the application structure are described here. You can see a more detailed structure in the [corresponding file](https://github.com/danchousz/ens_open_ledger/blob/main/project_structure.md).

### Sankey
Main component, draws a Sankey chart.

__Backend__

- [Service](https://github.com/danchousz/ens_open_ledger/blob/main/backend/services/sankeyService.mjs) processes and filters data for sending to Generator.
- [Generator](https://github.com/danchousz/ens_open_ledger/blob/main/backend/utils/sankeyDataGenerator.mjs) creates the arrays that Plotly needs to draw the chart, such as nodes, links, X and Y positions, colors, and so on.
- [API](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/sankeyRoutes.mjs).

__Frontend__

- [sankeyLayout](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/sankey/sankeyLayout.js) accepts data arrays from the generator, sets the canvas sizes, annotations, and configs.
- [nodeLabels](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/sankey/nodeLabels.js) forces changes to the chart's CSS elements, setting the position and size of node labels.
- [customDragOverlay](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/sankey/customDragOverlay.js) adds custom dragging as the built in Plotly is not the best quality.
- [plotlyListeners](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/sankey/plotlyListeners.js) makes nodes, annotations and links clickable and sets the corresponding functions.
- [sankey](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/sankey/sankey.js) gathers.

[__Styles__](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/components/sankey.css)

### Dropdown
Opens a dropdown with final recipients within a category when clicking on a node.
![Dropdown](https://i.ibb.co/L8DqNnY/2024-10-15-18-24-20.png)

__Backend__

- [Service](https://github.com/danchousz/ens_open_ledger/blob/main/backend/services/dropdownService.mjs) filters data related to end recipients within a given category.
- [API](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/dropdownRoutes.mjs).

__Frontend__

- [contractorsDropdown](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/dropdown/contractorsDropdown.js) generates a dropdown based on data received from the service.

[__Styles__](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/components/dropdown.css)

### Tables
Shows detailed statistics for the recipient when clicking Show All-time statistics in the dropdown.
![Table](https://i.ibb.co/yyvNfLd/2024-10-15-18-47-07.png)

__Backend__

- [Service](https://github.com/danchousz/ens_open_ledger/blob/main/backend/services/recipientDetailsService.mjs) filters data by the final recipient.
- [API](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/recipientDetailsRoutes.mjs).

__Frontend__ 

- [recipientDetails](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/tables/recipientDetails.js) сalculates statistics, draws diagrams, and creates a table based on data received from the service.
- 
[__Styles__](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/components/recipientDetails.css)

### Pie charts
Allows you to draw a pie chart instead of Sankey.
![Pie](https://i.ibb.co/hgdZnt2/2024-10-15-18-57-29.png)

__Backend__

Same as for Sankey.

__Frontend__

- [walletPie](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/pie/walletPie.js) redraws some charts in the PieChart. (e.g. [Ecosystem in 2024Q2](https://ens-ledger.app/quarter/2024Q2/Ecosystem))
- [tablePie](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/pie/tablePie.js) draws PieCharts for table.

### Export 
Formats a graph for export to SVG, PNG, CSV, JSON, and XSLX.

__Backend__

- [Service](https://github.com/danchousz/ens_open_ledger/blob/main/backend/services/exportService.mjs) sorts data from unnecessary for export
- [API](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/exportRoutes.mjs).

__Frontend__ 

- [exportChart](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/services/exportChart.js) generates canvas, layout and annotations for SVG and PNG images, as well as columns for table formats.

### Scripts

- [cronJobs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/utils/cronJobs.mjs) sets the Cron schedule.
- [new_miner](https://github.com/danchousz/ens_open_ledger/blob/main/scripts/data_miner/new_miner.py) collects information from the chain via Etherscan. Runs every 2 hours.
- [stream_grouper](https://github.com/danchousz/ens_open_ledger/blob/main/scripts/data_miner/stream_grouper.py) creates pseudo-transactions for a stream to service providers as if they were withdrawing funds every day. That is, it reflects the amount of funds they can withdraw. Runs every day.
- [merger](https://github.com/danchousz/ens_open_ledger/blob/main/scripts/data_miner/merger.py) processes data, assigns names to contractors, and determines the expense category. Runs every two hours after miner.
- [avatar_parser](https://github.com/danchousz/ens_open_ledger/blob/main/scripts/avatar_parser/parser.mjs) searches and downloads avatar records in the chain. Runs weekly, cache is cleared monthly in case someone changes the avatar.

## Requirements

- node (v20.12^)
- npm (v10.3^)
- frameworks and libs from [package.json](https://github.com/danchousz/ens_open_ledger/blob/main/package.json)
- Python (v3^)
- pip (v24)
- libs drom [requirements.txt](https://github.com/danchousz/ens_open_ledger/blob/main/requirements.txt)

## License

This project is licensed under the [MIT License](https://github.com/danchousz/ens_open_ledger/blob/main/LICENSE.txt). It’s open source and welcomes contributions from the community. Feel free to fork the repository, submit pull requests, and help improve the platform together!