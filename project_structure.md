.
├── backend
│   ├── [server.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/server.mjs) *Server Index*
│   ├── api *Server Router*
│   │   ├── [avatarRoutes.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/avatarRoutes.mjs) 
│   │   ├── [dropdownRoutes.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/dropdownRoutes.mjs)
│   │   ├── [exportRoutes.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/exportRoutes.mjs)
│   │   ├── [pageRoutes.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/pageRoutes.mjs)
│   │   ├── [recipientDetailsRoutes.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/recipientDetailsRoutes.mjs)
│   │   ├── [sankeyRoutes.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/sankeyRoutes.mjs)
│   │   ├── [saveResponseRoutes.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/saveResponseRoutes.mjs)
│   │   └── [unknownContractorsRoutes.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/api/unknownContractorsRoutes.mjs)
│   ├── services
│   │   ├── [avatarService.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/services/avatarService.mjs) *Service for binding the name and avatar*
│   │   ├── [dropdownService.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/services/dropdownService.mjs) *Service for processing data for dropdowns*
│   │   ├── [exportService.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/services/exportService.mjs) *Service for saving data*
│   │   ├── [recipientDetailsService.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/services/recipientDetailsService.mjs) *Service for building a table with recipient transactions*
│   │   └── [sankeyService.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/services/sankeyService.mjs) **Service for sorting data to send to sankeyDataGenerator**
│   └── utils
│       ├── [cronJobs.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/utils/cronJobs.mjs) *Runs Python and avatar parser scripts*
│       ├── [dataLoader.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/utils/dataLoader.mjs) *Reads CSV-db*
│       ├── [responseSaver.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/utils/responseSaver.mjs) *Saves responses from 'Identify Transactions' Modal*
│       └── [sankeyDataGenerator.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/backend/utils/sankeyDataGenerator.mjs) **Main util for processing data before final render on client side. Sets positions for nodes, defines models**
├── frontend
│   ├── components
│   │   ├── avatars
│   │   │   ├── parsed_avatars
│   │   │   └── static_avatars
│   │   ├── banner.css
│   │   ├── body.css
│   │   ├── buttons.css
│   │   ├── checkbox.css
│   │   ├── collapse.css
│   │   ├── dropdown.css
│   │   ├── favicons
│   │   ├── field.css
│   │   ├── icons
│   │   │   ├── ChartIcon.png
│   │   │   ├── LeftArrow.svg
│   │   │   ├── LeftChevron.svg
│   │   │   └── SankeyChartIcon.png
│   │   ├── logos
│   │   │   └── logo.jpeg
│   │   ├── modal.css
│   │   ├── recipientDetails.css
│   │   ├── sankey.css
│   │   ├── sideMenu.css
│   │   ├── typography.css
│   │   └── unknownContractors.css
│   ├── data
│   │   ├── ledger.csv *quarterly DB*
│   │   ├── ledger_year.csv *yearly DB*
│   │   └── unknown_contractors.csv *for Identify Transactions Modal*
│   ├── index.css
│   ├── index.html
│   └── js
│       ├── index.js
│       ├── modules
│       │   ├── [globalStates.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/globalStates.js)
│       │   ├── [globalVars.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/globalVars.js)
│       │   ├── [navigator.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/navigator.js)
│       │   ├── [domEventHandlers.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/domEventHandlers.js)
│       │   ├── banner
│       │   │   └── [createBanner.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/banner/createBanner.js) *Banners that pop up when you click on a link*
│       │   ├── dropdown
│       │   │   ├── [contractorsDropdown.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/dropdown/contractorsDropdown.js) *A universal dropdown that appears when you click on a node*
│       │   │   └── [reportDicts.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/dropdown/reportDicts.js)
│       │   ├── pie
│       │   │   ├── [tablePie.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/pie/tablePie.js) *The chart that appears in the recipient's table*
│       │   │   └── [walletPie.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/pie/walletPie.js) *The chart that appears when switching modes*
│       │   ├── sankey
│       │   │   ├── [customDragOverlay.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/sankey/customDragOverlay.js) *Overlay for dragging chart*
│       │   │   ├── [nodeLabels.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/sankey/nodeLabels.js) *Misc. Nodes Settings*
│       │   │   ├── [plotlyListeners.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/sankey/plotlyListeners.js) *Handlers that allows click on the Node, Annotation or Link*
│       │   │   ├── [sankey.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/sankey/sankey.js) **Main module, draws Diagram**
│       │   │   └── [sankeyLayout.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/sankey/sankeyLayout.js) *Layout Settings*
│       │   └── tables
│       │       ├── [recipientDetails.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/tables/recipientDetails.js) *Table with final recipients within the category.*
│       │       └── [unknownTransactions.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/modules/tables/unknownTransactions.js) *Identify Transactions Modal*
│       └── services
│           ├── [exportChart.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/services/exportChart.js)
│           ├── [loadAvatar.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/services/loadAvatar.js)
│           └── [utils.js](https://github.com/danchousz/ens_open_ledger/blob/main/frontend/js/services/utils.js)
└── scripts
    ├── avatar_parser
    │   ├── ens_avatar_cache.json
    │   └── [parser.mjs](https://github.com/danchousz/ens_open_ledger/blob/main/scripts/avatar_parser/parser.mjs) *Collecting ENS Avatars*
    └── data_miner
        ├── asset_prices.py *Helps to avoid mistakes in price history*
        ├── ens_wallets.py *List of ENS Wallets and Contractors*
        ├── transactions.py *List of Identified Transactions*
        ├── excluded_hashes.py
        ├── last_processed_block.txt *Tracks the last checked block*
        ├── local_ledgers *Intermediate data to help track the correct operation of scripts*
        │   ├── folders
        ├── quarterly_ledgers *Intermediate data to help track the correct operation of scripts*
        │   ├── folders
        ├── raw_txs *Folders with original data*
        │   ├── folders
        ├── [stream_grouper.py](https://github.com/danchousz/ens_open_ledger/blob/main/scripts/data_miner/stream_grouper.py) *Runs every day, simulating sending transactions to Service Providers*
        ├── [new_miner.py](https://github.com/danchousz/ens_open_ledger/blob/main/scripts/data_miner/new_miner.py) *Runs every two hours, scanning for new transactions via the Etherscan API and storing them in raw_txs*
        ├── [merger.py](https://github.com/danchousz/ens_open_ledger/blob/main/scripts/data_miner/merger.py) *Runs every 2 hours, the main script that processes data. Generates ledger.csv and ledger_year.csv.*