# Change Log
All notable changes to this project will be documented in this file.

## [1.0.2a] - 25.12.2024

### Changed

- The data collector now has an architecture with clear separation of concerns
- The bot now has an admin panel that allows you to control the identification of recipients and categories
- Identity keys are now stored in JSON instead of tuples

### Fixed

- Many bugs that prevented normal data collection and notification of bot subscribers

## [1.0.2] - 25.12.2024

### Added

- Telegram bot for the Ledger – @ens_ledger_bot. It can provide recent transactions, historical data and recipient search.

### Changed

- Funding through Hedgey Finance is now decomposed by tracking the recipients of NFTs. Previously, there were transactions in Hedger Finance, but it was not clear who exactly was ultimately receiving these funds.

## [1.0.1a] - 12.12.2024

### Added

- Legal invoices are now available by clicking on the flow (e.g. click on any flow [here](ens-ledger.app/quarter/2023Q4/category/DAO%20Tooling)) or in the recipient tables (e.g. like [here](http://ens-ledger.app/?details=Agora)). DAO does not use this kind of documentation very often, so there are currently 3 invoices available. They are pulled automatically from Google Cloud Storage, so stewards or a secretary can be given access to fill out the application with such invoices.
 
## [1.0.1] - 03.12.2024

### Added

- URLs for the tables with recipient details. Now you can share them no matter what schedule you are in. E.g. [Rotki Page](ens-ledger.app/?details=Rotki)
- Search engine. Now you can find any ENS contractor using the search field.
- The percentage of funds paid out within the SP stream within the quarter. You can get this data by clicking on the Stream node.
 
### Changed
  
- Identify transaction menu removed.
- Dropdowns are now closed only by clicking, but not when dragging.
- The background is now less bright.
- The positioning of nodes has been visually improved.
 
### Fixed
 
- A bug where nodes change their positions randomly.
- A bug with cron that sometimes did not execute the miner.