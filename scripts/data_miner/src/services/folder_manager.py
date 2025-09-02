import os
import pandas as pd
from utils.formatter import process_erc20_txs, process_internal_txs, merge_and_clean_txs
from utils.wallet_idetifier import identify_wallets, get_parent_wallet, get_base_category

def process_folder(folder_path, data):
    folder_name = os.path.basename(folder_path).strip('$')
    parent_wallet = get_parent_wallet(folder_name)
    base_category = get_base_category(folder_name)

    token_file = os.path.join(folder_path, 'token.csv')
    internal_file = os.path.join(folder_path, 'internal.csv')

    if not os.path.exists(token_file) or not os.path.exists(internal_file):
        print(f"Files not found for {folder_name}")
        return pd.DataFrame()

    token_df = process_erc20_txs(token_file, data)
    internal_df = process_internal_txs(internal_file)

    merged_df = merge_and_clean_txs(token_df, internal_df)
    named_df = identify_wallets(merged_df, data, folder_name)

    if folder_name != parent_wallet:
        named_df['To_category'] = named_df.apply(lambda row: 
            row['To_category'] if row['To_name'].endswith('Swap') else
            base_category if row['Transaction Hash'] not in data['txs_dict'] else 
            row['To_category'], axis=1)
        
        named_df['From_name'] = named_df.apply(lambda row:
            row['From_name'] if row['From_name'].endswith('Swap') else parent_wallet, axis=1)
        named_df['From_category'] = named_df.apply(lambda row:
            row['From_category'] if row['From_name'].endswith('Swap') else parent_wallet, axis=1)
        
        named_df['To_name'] = named_df.apply(lambda row:
            parent_wallet if row['From_name'].endswith('Swap') else row['To_name'], axis=1)
        named_df['To_category'] = named_df.apply(lambda row: 
            parent_wallet if row['From_name'].endswith('Swap') 
            else ('Metagov' if row['To_name'] == 'Metagov' 
            else row['To_category']), axis=1)
        
        named_df['To_name'] = named_df.apply(lambda row: 
            row['To'][:8] if row['Acquainted?'] == 0 else row['To_name'], axis=1)
        named_df['Acquainted?'] = 1
        named_df = named_df[named_df['To_name'] != folder_name]

    return named_df