import os

def save_results(quarterly_ledger, unknown_contractors, yearly_ledger=None):
    save_dir = os.path.join('..', 'frontend', 'data')
    os.makedirs(save_dir, exist_ok=True)
    
    quarterly_ledger.to_csv(os.path.join(save_dir, 'ledger.csv'), index=False)
    print(f"Saved {len(quarterly_ledger)} transactions to ledger.csv")
    
    if yearly_ledger is not None:
        yearly_ledger.to_csv(os.path.join(save_dir, 'ledger_year.csv'), index=False)
        print(f"Saved {len(yearly_ledger)} transactions to ledger_year.csv")
    
    unknown_contractors.to_csv(os.path.join(save_dir, 'unknown_contractors.csv'), index=False)
    print(f"Saved {len(unknown_contractors)} unknown transactions to unknown_contractors.csv")