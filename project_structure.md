.
├── backend
│   ├── api
│   │   ├── avatarRoutes.mjs
│   │   ├── dropdownRoutes.mjs
│   │   ├── exportRoutes.mjs
│   │   ├── pageRoutes.mjs
│   │   ├── recipientDetailsRoutes.mjs
│   │   ├── sankeyRoutes.mjs
│   │   ├── saveResponseRoutes.mjs
│   │   └── unknownContractorsRoutes.mjs
│   ├── data.json
│   ├── server.mjs
│   ├── services
│   │   ├── avatarService.mjs
│   │   ├── dropdownService.mjs
│   │   ├── exportService.mjs
│   │   ├── recipientDetailsService.mjs
│   │   └── sankeyService.mjs
│   └── utils
│       ├── cronJobs.mjs
│       ├── dataLoader.mjs
│       ├── responseSaver.mjs
│       └── sankeyDataGenerator.mjs
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
│   │   │   └── favicon.png
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
│   │   ├── ledger.csv
│   │   ├── ledger_year.csv
│   │   └── unknown_contractors.csv
│   ├── index.css
│   ├── index.html
│   └── js
│       ├── index.js
│       ├── modules
│       │   ├── banner
│       │   │   └── createBanner.js
│       │   ├── domEventHandlers.js
│       │   ├── dropdown
│       │   │   ├── contractorsDropdown.js
│       │   │   └── reportDicts.js
│       │   ├── globalStates.js
│       │   ├── globalVars.js
│       │   ├── navigator.js
│       │   ├── pie
│       │   │   ├── tablePie.js
│       │   │   └── walletPie.js
│       │   ├── sankey
│       │   │   ├── customDragOverlay.js
│       │   │   ├── nodeLabels.js
│       │   │   ├── plotlyListeners.js
│       │   │   ├── sankey.js
│       │   │   └── sankeyLayout.js
│       │   └── tables
│       │       ├── recipientDetails.js
│       │       └── unknownTransactions.js
│       └── services
│           ├── exportChart.js
│           ├── loadAvatar.js
│           └── utils.js
└── scripts
    ├── avatar_parser
    │   ├── ens_avatar_cache.json
    │   ├── ens_avatar_cache§.json
    │   └── parser.mjs
    └── data_miner
        ├── asset_prices.py
        ├── ens_wallets.py
        ├── excluded_hashes.py
        ├── keys.py
        ├── last_processed_block.txt
        ├── local_ledgers
        │   ├── folders
        ├── merger.py
        ├── new_miner.py
        ├── quarterly_ledgers
        │   ├── folders
        ├── raw_txs
        │   ├── folders
        ├── stream_grouper.py
        ├── test.py
        ├── transactions.py
        └── uc_responses.json