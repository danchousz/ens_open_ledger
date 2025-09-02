import sys, os
from glob import glob
sys.path.append(os.path.dirname(__file__))

from utils.data_loading import load_all_data
from services.folder_manager import process_folder
from utils.unknown_extractor import extract_unknown_contractors
from utils.saving import save_results

from services.ledger_processor import process_all_transactions

def main():
    print("Loading all data...")
    data = load_all_data()
    
    print("Processing folders...")
    raw_data_dir = os.path.join('..', 'scripts', 'data_miner', 'data', 'raw')
    print(f"Looking for folders in: {os.path.abspath(raw_data_dir)}")
    
    folders = glob(os.path.join(raw_data_dir, '$*'))
    
    all_transactions = []
    for folder in folders:
        folder_transactions = process_folder(folder, data)
        print(f"Processing group: {folder}. Tx count: {len(folder_transactions)}")
        if not folder_transactions.empty:
            all_transactions.append(folder_transactions)
    
    print(f"Total transaction sets: {len(all_transactions)}")

    unknown_contractors = extract_unknown_contractors(all_transactions)
    quarterly_ledger = process_all_transactions(all_transactions, data, is_year=False)
    yearly_ledger = process_all_transactions(all_transactions, data, is_year=True)
    
    print("Saving results...")
    save_results(quarterly_ledger, unknown_contractors, yearly_ledger)
    
    print("Processing complete!")

if __name__ == "__main__":
    main()