<br>├── backend<br>
│   ├── [server.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/server.mjs) **Server Index**<br>
│   ├── api **Server Router**<br>
│   │   ├── [avatarRoutes.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/avatarRoutes.mjs) <br>
│   │   ├── [dropdownRoutes.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/dropdownRoutes.mjs)<br>
│   │   ├── [exportRoutes.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/exportRoutes.mjs)<br>
│   │   ├── [pageRoutes.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/pageRoutes.mjs)<br>
│   │   ├── [recipientDetailsRoutes.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/recipientDetailsRoutes.mjs)<br>
│   │   ├── [sankeyRoutes.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/sankeyRoutes.mjs)<br>
│   │   ├── [saveResponseRoutes.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/saveResponseRoutes.mjs)<br>
│   │   └── [unknownContractorsRoutes.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/unknownContractorsRoutes.mjs)<br>
│   ├── services<br>
│   │   ├── [avatarService.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/services/avatarService.mjs) **Service for binding the name and avatar**<br>
│   │   ├── [dropdownService.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/services/dropdownService.mjs) **Service for processing data for dropdowns**<br>
│   │   ├── [exportService.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/services/exportService.mjs) **Service for saving data**<br>
│   │   ├── [recipientDetailsService.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/services/recipientDetailsService.mjs) **Service for building a table with recipient transactions**<br>
│   │   └── [sankeyService.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/services/sankeyService.mjs) **Service for sorting data to send to sankeyDataGenerator**<br>
│   └── utils<br>
│       ├── [cronJobs.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/utils/cronJobs.mjs) **Runs Python and avatar parser scripts**<br>
│       ├── [dataLoader.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/utils/dataLoader.mjs) **Reads CSV-db**<br>
│       ├── [responseSaver.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/utils/responseSaver.mjs) **Saves responses from 'Identify Transactions' Modal**<br>
│       └── [sankeyDataGenerator.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/utils/sankeyDataGenerator.mjs) **Main util for processing data before final render on client side. Sets positions for nodes, defines models**<br><br>
├── frontend<br>
│   ├── components<br>
│   │   ├── avatars<br>
│   │   │   ├── parsed_avatars<br>
│   │   │   └── static_avatars<br>
│   │   ├── banner.css<br>
│   │   ├── body.css<br>
│   │   ├── buttons.css<br>
│   │   ├── checkbox.css<br>
│   │   ├── collapse.css<br>
│   │   ├── dropdown.css<br>
│   │   ├── favicons<br>
│   │   ├── field.css<br>
│   │   ├── icons<br>
│   │   │   ├── ChartIcon.png<br>
│   │   │   ├── LeftArrow.svg<br>
│   │   │   ├── LeftChevron.svg<br>
│   │   │   └── SankeyChartIcon.png<br>
│   │   ├── logos<br>
│   │   │   └── logo.jpeg<br>
│   │   ├── modal.css<br>
│   │   ├── recipientDetails.css<br>
│   │   ├── sankey.css<br>
│   │   ├── sideMenu.css<br>
│   │   ├── typography.css<br>
│   │   └── unknownContractors.css<br>
│   ├── data<br>
│   │   ├── ledger.csv **quarterly DB**<br>
│   │   ├── ledger_year.csv **yearly DB**<br>
│   │   └── unknown_contractors.csv **for Identify Transactions Modal**<br>
│   ├── index.css<br>
│   ├── index.html<br>
│   └── js<br>
│       ├── index.js<br>
│       ├── modules<br>
│       │   ├── [globalStates.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/globalStates.js)<br>
│       │   ├── [globalVars.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/globalVars.js)<br>
│       │   ├── [navigator.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/navigator.js)<br>
│       │   ├── [domEventHandlers.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/domEventHandlers.js)<br>
│       │   ├── banner<br>
│       │   │   └── [createBanner.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/banner/createBanner.js) **Banners that pop up when you click on a link**<br>
│       │   ├── dropdown<br>
│       │   │   ├── [contractorsDropdown.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/dropdown/contractorsDropdown.js) **A universal dropdown that appears when you click on a node**<br>
│       │   │   └── [reportDicts.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/dropdown/reportDicts.js)<br>
│       │   ├── pie<br>
│       │   │   ├── [tablePie.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/pie/tablePie.js) **The chart that appears in the recipient's table**<br>
│       │   │   └── [walletPie.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/pie/walletPie.js) **The chart that appears when switching modes**<br>
│       │   ├── sankey<br>
│       │   │   ├── [customDragOverlay.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/sankey/customDragOverlay.js) **Overlay for dragging chart**<br>
│       │   │   ├── [nodeLabels.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/sankey/nodeLabels.js) **Misc. Nodes Settings**<br>
│       │   │   ├── [plotlyListeners.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/sankey/plotlyListeners.js) **Handlers that allows click on the Node, Annotation or Link**<br>
│       │   │   ├── [sankey.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/sankey/sankey.js) **Main module, draws Diagram**<br>
│       │   │   └── [sankeyLayout.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/sankey/sankeyLayout.js) **Layout Settings**<br>
│       │   └── tables<br>
│       │       ├── [recipientDetails.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/tables/recipientDetails.js) **Table with final recipients within the category**<br>
│       │       └── [unknownTransactions.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/tables/unknownTransactions.js) **Identify Transactions Modal**<br>
│       └── services<br>
│           ├── [exportChart.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/services/exportChart.js)<br>
│           ├── [loadAvatar.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/services/loadAvatar.js)<br>
│           └── [utils.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/services/utils.js)<br><br>
└── scripts<br>
    ├── avatar_parser<br>
    │   ├── ens_avatar_cache.json<br>
    │   └── [parser.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/scripts/avatar_parser/parser.mjs) **Collecting ENS Avatars**<br>
    └── data_miner<br>
        ├── asset_prices.py **Helps to avoid mistakes in price history**<br>
        ├── ens_wallets.py **List of ENS Wallets and Contractors**<br>
        ├── transactions.py **List of Identified Transactions**<br>
        ├── excluded_hashes.py<br>
        ├── last_processed_block.txt **Tracks the last checked block**<br>
        ├── local_ledgers **Intermediate data to help track the correct operation of scripts**<br>
        │   ├── folders<br>
        ├── quarterly_ledgers **Intermediate data to help track the correct operation of scripts**<br>
        │   ├── folders<br>
        ├── raw_txs **Folders with original data**<br>
        │   ├── folders<br>
        ├── [stream_grouper.py](https://github.com/danchousz/ens_open_ledger/blob/main/scripts/data_miner/stream_grouper.py) **Runs every day, simulating sending transactions to Service Providers**<br>
        ├── [new_miner.py](https://github.com/danchousz/ens_open_ledger/blob/main/scripts/data_miner/new_miner.py) **Runs every two hours, scanning for new transactions via the Etherscan API and storing them in raw_txs**<br>
        ├── [merger.py](https://github.com/danchousz/ens_open_ledger/blob/main/scripts/data_miner/merger.py) **Runs every 2 hours, the main script that processes data. Generates ledger.csv and ledger_year.csv**<br>