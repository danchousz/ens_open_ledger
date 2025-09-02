import json
import os
import pandas as pd

def load_json_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"File {file_path} not found")
        return None
    except json.JSONDecodeError as e:
        print(f"JSON parsing error in file {file_path}: {e}")
        return None

def load_all_data():

    config_dir = os.path.join('..', 'scripts', 'data_miner', 'config')

    transactions_data = load_json_file(os.path.join(config_dir, 'transactions.json'))
    wallets_data = load_json_file(os.path.join(config_dir, 'ens_wallets.json'))
    prices_data = load_json_file(os.path.join(config_dir, 'asset_prices.json'))
    excluded_data = load_json_file(os.path.join(config_dir, 'bad_hashes.json'))

    txs_dict = {}
    if transactions_data:
        if isinstance(transactions_data, list):
            for category_data in transactions_data:
                category = category_data.get('category', '')
                txhashes = category_data.get('txhashes', [])
                for tx_hash in txhashes:
                    txs_dict[tx_hash] = category
        else:
            for category_data in transactions_data.get('transactions', []):
                category = category_data.get('category', '')
                txhashes = category_data.get('txhashes', [])
                for tx_hash in txhashes:
                    txs_dict[tx_hash] = category

    wallets_dict = {}
    swap_wallets = set()
    if wallets_data:
        wallets_list = wallets_data if isinstance(wallets_data, list) else wallets_data.get('wallets', [])
        for wallet in wallets_list:
            name = wallet.get('name', '')
            wallet_type = wallet.get('type', '')
            addresses = wallet.get('addresses', [])
            details = wallet.get('details', [])
            
            if wallet_type == 'Swap':
                swap_wallets.add(name)
            
            for address in addresses:
                if details:
                    wallets_dict[address.lower()] = (name, details[0])
                else:
                    wallets_dict[address.lower()] = (name, name)

    prices_dict = {}
    if prices_data:
        prices_list = prices_data if isinstance(prices_data, list) else prices_data.get('prices', [])
        for price_entry in prices_list:
            date_str = price_entry.get('date', '')
            ens_price = price_entry.get('ens_price', 0)
            eth_price = price_entry.get('eth_price', 0)
            
            if date_str:
                date_obj = pd.to_datetime(date_str).date()
                prices_dict[date_obj] = (ens_price, eth_price)

    bad_hashes = []
    ignore_duplicates = []
    if excluded_data:
        bad_hashes = excluded_data.get('excluded_hashes', [])
        ignore_duplicates = excluded_data.get('ignore_duplicates', [])

    return {
        'txs_dict': txs_dict,
        'wallets_dict': wallets_dict,
        'swap_wallets': swap_wallets,
        'prices_dict': prices_dict,
        'bad_hashes': bad_hashes,
        'ignore_duplicates': ignore_duplicates
    }