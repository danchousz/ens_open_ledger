import os
import pandas as pd
from glob import glob

from ens_wallets import ens_wallets
from transactions import various_txs
from asset_prices import prices
from excluded_hashes import bad_hashes

# Function aimed at unifying data downloaded from etherscan for erc-20 transactions
def process_erc20_txs(token_file, prices_dict):
    df = pd.read_csv(token_file)

    col_to_remove = ['Blockno', 'UnixTimestamp', 'ContractAddress', 'TokenName']
    df.drop(columns=col_to_remove, inplace=True)

    col_to_rename = {
        'DateTime (UTC)': 'Date',
        'TokenValue': 'Value',
        'USDValueDayOfTx': 'DOT_USD',                        #DOT_USD - "DayOfTx", Reflects the amount in USD at the time of the transaction.
        'TokenSymbol': 'Symbol'
    }
    df.rename(columns=col_to_rename, inplace=True)

    df = df[df['Symbol'].isin(['WETH', 'USDC', 'ENS'])]      # DAI is not needed since there are no relevant transactions in the period in question. 
                                                             # USDCx was also not added, since USDC provides all the information on streams.
    df['Original_WETH'] = df['Symbol'] == 'WETH'
    df['Symbol'] = df['Symbol'].replace({'WETH': 'ETH'})     # It is easier to combine those transactions quarterly.
    df['Value'] = pd.to_numeric(df['Value'].astype(str).replace(r'[\$,]', '', regex=True), errors='coerce')
    df['DOT_USD'] = pd.to_numeric(df['DOT_USD'].astype(str).replace(r'[\$,]', '', regex=True), errors='coerce')
    df['Date'] = pd.to_datetime(df['Date']).dt.date

    df.loc[df['Symbol'] == 'USDC', 'DOT_USD'] = df.loc[df['Symbol'] == 'USDC', 'Value']

    df = df[~df['Transaction Hash'].isin(bad_hashes)]

    for index, row in df.iterrows():
        if pd.isna(row['DOT_USD']):
            date = row['Date']                               # Typically Etherscan provides information about the amount at the time of transfer
            value = row['Value']                             # However, this does not always happen; for example, in cases with multisends, DayOfTx has no value.
            symbol = row['Symbol']                           # To solve that, prices_dict was introduced, which stores asset prices.
            if symbol == 'USDC':
                df.at[index, 'DOT_USD'] = value
            elif symbol in ['ETH', 'ENS']:
                price = prices_dict.get(date, (0, 0))[0 if symbol == 'ENS' else 1]
                df.at[index, 'DOT_USD'] = value * price

    return df

# Function aimed at unifying data downloaded from etherscan for internal transactions
def process_internal_txs(internal_file):
    with open(internal_file, 'r') as f:
        first_line = f.readline().strip()
    
    first_line += ',PrivateNote'
    
    temp_file = 'temp_internal.csv'
    with open(internal_file, 'r') as original, open(temp_file, 'w') as temp:
        temp.write(first_line + '\n') 
        next(original) 
        for line in original:
            temp.write(line)
    
    df = pd.read_csv(temp_file)
    
    col_to_remove = ['Blockno', 'UnixTimestamp', 'ParentTxFrom', 'ParentTxTo', 
                     'ParentTxETH_Value', 'ContractAddress', 'ErrCode', 'Type', 'PrivateNote']
    df.drop(columns=col_to_remove, inplace=True)
    df.drop(columns=[col for col in df if col.startswith('CurrentValue @')], inplace=True)
    df = df[df['Status'] != 1].drop(columns=['Status'])
    
    numeric_columns = ['Value_IN(ETH)', 'Value_OUT(ETH)', 'Historical $Price/Eth']
    for column in numeric_columns:                                                    
        df[column] = pd.to_numeric(df[column], errors='coerce')
    df['Value'] = df.apply(lambda x: x['Value_IN(ETH)'] if x['Value_OUT(ETH)'] == 0 else -x['Value_OUT(ETH)']
                           if x['Value_IN(ETH)'] == 0 else max(x['Value_IN(ETH)'], -x['Value_OUT(ETH)']), axis=1) 
    df['DOT_USD'] = df['Value'] * df['Historical $Price/Eth']
    df.drop(columns=numeric_columns, inplace=True)

    col_to_rename = {
        'DateTime (UTC)': 'Date', 
        'TxTo': 'To'
    }
    df.rename(columns=col_to_rename, inplace=True)

    df['Date'] = pd.to_datetime(df['Date']).dt.date
    df['Symbol'] = 'ETH'

    os.remove(temp_file)

    return df

# Function to merge erc20 and internal txs
def merge_txs(df1, df2):
    merged_df = pd.concat([df1, df2])
    merged_df['Date'] = pd.to_datetime(merged_df['Date'])
    merged_df.sort_values(by='Date', inplace=True)

    merged_df = merged_df[
        (merged_df['Value'] != 0) &                          # Removing Nulls
        ~((merged_df['Symbol'] == 'USDC') & 
        (merged_df['Value'] <= 11)) &                         # Removing Tests
        (merged_df['From'] != merged_df['To'])               # Removing Self Txs
    ]

    return merged_df

def get_parent_wallet(folder_name):
    if folder_name.endswith(' SG'):
        return 'Ecosystem'
    elif folder_name == "Large Grants Pod":
        return 'Public Goods'
    elif folder_name.endswith(' Pod'):
        return 'Metagov'
    elif folder_name == 'Support SG (pre-dissolve)':
        return 'Community WG'
    else:
        return folder_name

def get_base_category(folder_name):
    if folder_name.endswith(' SG'):
        return folder_name.rsplit(' ', 1)[0]
    elif folder_name == "Large Grants Pod":
        return "PG Large Grants"
    elif folder_name.endswith(' Pod'):
        return folder_name.rsplit(' ', 1)[0]
    elif folder_name == 'Support SG (pre-dissolve)':
        return 'Support'
    else:
        return folder_name

# Function assigning names to wallets
def identify_wallets(df, wallets_dict, txs_dict, folder_name):

    def replace_on_match(to, from_address, txhash):          # Replacement based on the location of the wallet
        if txhash in txs_dict:                               # in the hand made 'transactions' database. Read more: readme
            if folder_name == from_address:
                return txs_dict[txhash], from_address
            else:
                return to, txs_dict[txhash]
        return to, from_address
    
    def check_acquaintance(row):                             # Flag for further deleting unknown transactions in a grouped dataframe
        from_known = any(row['From_category'] == wallet_category for wallet_category, _ in wallets_dict.values()) or row['From_category'] in txs_dict.values()
        to_known = any(row['To_category'] == wallet_category for wallet_category, _ in wallets_dict.values()) or row['To_category'] in txs_dict.values()
        return 1 if from_known and to_known else 0
    
    
    df['From_category'] = df['From'].apply(lambda address: 
                    wallets_dict.get(address, (address, address))[0])     # Replacement based on the location of the wallet
    df['To_category'] = df['To'].apply(lambda address:                    # in the 'ens_wallets' category. Read more: readme
                    wallets_dict.get(address, (address, address))[0])
    df['From_name'] = df['From'].apply(lambda address:
                    wallets_dict.get(address, (address, address))[1])
    df['To_name'] = df['To'].apply(lambda address: 
                    wallets_dict.get(address, (address, address))[1])

    df[['To_category', 'From_category']] = df.apply(lambda row: replace_on_match
                                  (row['To_category'], row['From_category'], row.get('Transaction Hash', '')), axis=1, result_type='expand')

    df['From_name'] = df.apply(lambda row: 
                    row['From_category'] if row['From_name'] == row['From'] else row['From_name'], axis=1)
    df['To_name'] = df.apply(lambda row: 
                    row['To_category'] if row['To_name'] == row['To'] else row['To_name'], axis=1)
    df['Acquainted?'] = df.apply(check_acquaintance, axis=1)

    df['To_category'] = df.apply(lambda row: 
                                row['To_name'][:-3] if row['To_name'].endswith(' SG') and row['To_category'] == row['To_name']
                                 else row['To_name'][:-4] if row['To_name'].endswith(' Pod') and row['To_category'] == row['To_name']
                                 else row['To_name'] if row['To_category'] == row['To']
                                 else row['To_category'], axis=1)
    
    if folder_name == "Large Grants Pod":
        df = df[df['To_name'] != 'Public Goods']
        df = df[df['From_name'] != 'Public Goods']
        df['To_category'] = df.apply(lambda row: 
            "PG Large Grants" if row['Transaction Hash'] not in txs_dict else row['To_category'], axis=1)
        
        cow_mask = df['From_name'] == 'CoW'
        swap_mask = df['From_name'].str.endswith('Swap')
        
        df.loc[cow_mask | swap_mask, ['To_name', 'To_category']] = 'Public Goods'
        df.loc[~(cow_mask | swap_mask), ['From_name', 'From_category']] = 'Public Goods'
        
        df['Value'] = -abs(df['Value'])
        df['DOT_USD'] = -abs(df['DOT_USD'])
    elif folder_name.endswith(' SG'):
        df = df[df['To_name'] != 'Ecosystem']
        df = df[df['From_name'] != 'Ecosystem']
        base_category = folder_name.rsplit(' ', 1)[0]
        df['To_category'] = df.apply(lambda row: 
            base_category if row['Transaction Hash'] not in txs_dict else row['To_category'], axis=1)
        
        cow_mask = df['From_name'] == 'CoW'
        swap_mask = df['From_name'].str.endswith('Swap')
        
        df.loc[cow_mask | swap_mask, ['To_name', 'To_category']] = 'Ecosystem'
        df.loc[~(cow_mask | swap_mask), ['From_name', 'From_category']] = 'Ecosystem'
        
        df['Value'] = -abs(df['Value'])
        df['DOT_USD'] = -abs(df['DOT_USD'])
    elif folder_name.endswith(' Pod'):
        df = df[df['To_name'] != 'Metagov']
        df = df[df['From_name'] != 'Metagov']
        base_category = folder_name.rsplit(' ', 1)[0]
        df['To_category'] = df.apply(lambda row: 
            base_category if row['Transaction Hash'] not in txs_dict else row['To_category'], axis=1)
        
        cow_mask = df['From_name'] == 'CoW'
        swap_mask = df['From_name'].str.endswith('Swap')
        
        df.loc[cow_mask | swap_mask, ['To_name', 'To_category']] = 'Metagov'
        df.loc[~(cow_mask | swap_mask), ['From_name', 'From_category']] = 'Metagov'
        
        df['Value'] = -abs(df['Value'])
        df['DOT_USD'] = -abs(df['DOT_USD'])
    elif folder_name == 'Support SG (pre-dissolve)':
        df = df[df['To_name'] != 'Community WG']
        df = df[df['From_name'] != 'Community WG']
        df['To_category'] = 'Support'
        
        cow_mask = df['From_name'] == 'CoW'
        swap_mask = df['From_name'].str.endswith('Swap')
        
        df.loc[cow_mask | swap_mask, ['To_name', 'To_category']] = 'Community WG'
        df.loc[~(cow_mask | swap_mask), ['From_name', 'From_category']] = 'Community WG'
        
        df['Value'] = -abs(df['Value'])
        df['DOT_USD'] = -abs(df['DOT_USD'])

    if folder_name.endswith(' SG') or folder_name.endswith(' Pod') or folder_name == "Large Grants Pod":
        df = df.copy()
        df['To_name'] = df.apply(lambda row: 
            row['To'][:8] if row['Acquainted?'] == 0 else row['To_name'], axis=1)
        df['Acquainted?'] = 1
        
    if folder_name.endswith(' SG') or folder_name.endswith(' Pod') or folder_name == "Large Grants Pod":
        df = df[df['To_name'] != folder_name]

    mask = (                                                 # The sign before the value for erc20 transactions
        (df['From_category'] == folder_name) &               # is assigned using the folder_name membership.
        ((df['Symbol'].isin(['USDC', 'ENS']))                # Let's say DAO Wallet sent 100 USDC to Ecosystem.
        | (df['Original_WETH']))                             # The DAO Wallet ledger will have a transaction with -100 USDC 
    )                                                        # and the Ecosystem ledger will have 100 USDC.
    df.loc[mask, ['Value', 'DOT_USD']] *= -1

    df = df.copy()

    df['Thru'] = folder_name if folder_name != get_parent_wallet(folder_name) else 'Direct'

    def force_rename_specific_transactions(df):

        specific_names = {
            '0x6629454d3365f2f6717dce07ab79a423c544a842436cba5c9f846227e40424df': 'premm.eth',
            '0xb07500c4d7dcfce1924db68324f103dccd7be6273ad4fabc87dc0e0e8910e5ad': 'premm.eth',
            '0x81b6b744ff95090b9d2727e7d5b6c9301e643a9de8305377011c2c5a4f11084a': 'Providers',
            '0xcdb37683ee78536c1cbc9e190dfa5805ce408e4fa1182235b400fd54f2b36ed9': 'Hackathons SG',
            '0x2930846bf5fe2844d4a5d280ae54753a6265f2f75b576945fdd268fc863b43e9': 'Community SG',
            '0x1d16ce36118f0903c89a856661083a017524e4e8d9225b87948cb21e993e4377': 'Gitcoin Grants',
        }
        specific_cats = {
            '0x81b6b744ff95090b9d2727e7d5b6c9301e643a9de8305377011c2c5a4f11084a': 'Providers',
            '0x2930846bf5fe2844d4a5d280ae54753a6265f2f75b576945fdd268fc863b43e9': 'Community SG',
        }
        specific_wallets = {
            '0x9b9c249be04dd433c7e8fbbf5e61e6741b89966d': 'Hackathons SG',
        }
        specific_senders = {
            '0x9bf05272c1debfd466109f0dc99f6aac323934ee04b92a8cffb8720ff8bbf0c1': 'Dissolved Community WG',
            '0xf40e1c129ab1d20576a4a6776b16624e0a7d08d492b2433a214127e45584121d': 'Dissolved Community WG',
            '0x1c59f0b0a7e14f4422afe3aaeed210da036c15c1570a0a1549019f4b62aa983e': 'Dissolved Community WG',
        }
        specific_senders_cats = {
            '0x9bf05272c1debfd466109f0dc99f6aac323934ee04b92a8cffb8720ff8bbf0c1': 'Dissolved Community WG',
            '0xf40e1c129ab1d20576a4a6776b16624e0a7d08d492b2433a214127e45584121d': 'Dissolved Community WG',
            '0x1c59f0b0a7e14f4422afe3aaeed210da036c15c1570a0a1549019f4b62aa983e': 'Dissolved Community WG',
        }

        for hash_value, to_name in specific_names.items():
            df.loc[df['Transaction Hash'] == hash_value, 'To_name'] = to_name

        for hash_value, to_category in specific_cats.items():
            df.loc[df['Transaction Hash'] == hash_value, 'To_category'] = to_category

        for to, to_name in specific_wallets.items():
            df.loc[df['To'] == to, 'To_name'] = to_name

        for hash_value, from_name in specific_senders.items():
            df.loc[df['Transaction Hash'] == hash_value, 'From_name'] = from_name
        
        for hash_value, from_category in specific_senders_cats.items():
            df.loc[df['Transaction Hash'] == hash_value, 'From_category'] = from_category

        df.loc[(df['Transaction Hash'] == '0x15b33f26832e8c7eb39448e94ddd13b48e73c22df414e1b9d55dabc1df540b2d') & 
            (df['To'] == '0xa19a7ae868ede64c6c5256a64bcd3bf3a9f2d615'), 'To_name'] = 'cryptowork.eth'

        return df

    df = force_rename_specific_transactions(df)

    df.loc[df['To_name'] == 'Discord Support', 'To_category'] = 'Support'
    
    df = df.reindex(columns=['Transaction Hash', 'Date', 'From', 'From_name', 'From_category', 'To', 'To_name', 'To_category', 'Value', 'DOT_USD', 'Symbol', 'Acquainted?', 'Thru'])

    return df

def add_quarter(date):         
    year, month, day = date.year, date.month, date.day       # The sole purpose of this feature is to move the very first
    if year == 2022:                                         # working group funding from 2022Q1 to 2022Q2.
        if (month < 3) or (month == 3 and day < 31):
            return f'{year}Q1'
        elif (month == 3 and day == 31) or (month > 3 and month < 7):
            return f'{year}Q2'
        elif (month > 6 and month < 10):                     
            return f'{year}Q3'                               # The transaction was made on March 31 and this fact would
        else:                                                # have a negative impact on the visualization.
            return f'{year}Q4'
    else:
        if month in (1, 2, 3):
            return f'{year}Q1'
        elif month in (4, 5, 6):
            return f'{year}Q2'
        elif month in (7, 8, 9):
            return f'{year}Q3'
        else:
            return f'{year}Q4'
        
def get_quarter_end_date(date):
    if not pd.isna(date):
        year, month, day = date.year, date.month, date.day
        if year == 2022:
            if month <= 3:
                return pd.Timestamp(f'{year}-03-30')
            elif month <= 6:
                return pd.Timestamp(f'{year}-06-30')
            elif month <= 9:
                return pd.Timestamp(f'{year}-09-30')
            else:
                return pd.Timestamp(f'{year}-12-31')
        else:
            if month <= 3:
                return pd.Timestamp(f'{year}-03-31')
            elif month <= 6:
                return pd.Timestamp(f'{year}-06-30')
            elif month <= 9:
                return pd.Timestamp(f'{year}-09-30')
            else:
                return pd.Timestamp(f'{year}-12-31')
    return None

# Grouping by quarter
def group_by_quarter(df):
    df['Quarter'] = df['Date'].apply(add_quarter)
    grouped_df = df.groupby(['Quarter', 'From_category', 'To_category', 'Symbol'], as_index=False).agg({'Value': 'sum', 'DOT_USD': 'sum'})
    return grouped_df

# The function adds interquarter balances for the benefit of future visualization
def add_unspent_balances(grouped_df, prices_dict, folder_name):
    unspent_df = pd.DataFrame()
    quarters = sorted(grouped_df['Quarter'].unique())
    symbols = grouped_df['Symbol'].unique()
    cumulative_unspent = {symbol: 0 for symbol in symbols}   # The balances are summed up and transferred to the next interquarter balance

    for quarter in quarters:
        for symbol in symbols:
            if folder_name != "Community WG":
                quarter_data = grouped_df[(grouped_df['Quarter'] == quarter) & (grouped_df['Symbol'] == symbol)]
                current_unspent_value = quarter_data['Value'].sum() + cumulative_unspent[symbol]
                cumulative_unspent[symbol] = current_unspent_value

                if symbol == 'USDC':                             # DOT_USD of inter-quarter balances
                    unspent_dot_usd = current_unspent_value      # are calculated exactly at the end of the quarter
                else:
                    unspent_date = get_unspent_date(quarter, prices_dict)
                    if unspent_date is None:
                        continue

                    price_index = 0 if symbol == 'ENS' else 1
                    unspent_dot_usd = current_unspent_value * prices_dict[unspent_date][price_index]

                unspent_row = {
                    'Quarter': f"{quarter} Unspent",
                    'From_category': folder_name,
                    'To_category': folder_name,
                    'Symbol': symbol,
                    'Value': current_unspent_value,              # The balances transferring inside the wallet itself
                    'DOT_USD': unspent_dot_usd                   # Except Community WG, since it was dissolved after one Q
                }
                unspent_df = pd.concat([unspent_df, pd.DataFrame([unspent_row])], ignore_index=True)

    return unspent_df

# Interquarter balances have a clear date - the last day of the quarter.
def get_unspent_date(quarter, prices_dict):
    year, q = quarter[:4], quarter[-1]
    quarter_ends = {
        '1': pd.Timestamp(f'{year}-03-31').date(),
        '2': pd.Timestamp(f'{year}-06-30').date(),
        '3': pd.Timestamp(f'{year}-09-30').date(),
        '4': pd.Timestamp(f'{year}-12-31').date()
    }
    target_date = quarter_ends[q]
    available_dates = [pd.to_datetime(date).date() for date in prices_dict.keys()]
    available_dates.sort()

    closest_date = None
    for date in available_dates:
        if date <= target_date:
            closest_date = date
        else:
            break

    if closest_date is None and available_dates:
        closest_date = available_dates[0]

    return closest_date

def calculate_interquarter_balances(df, wallet):
    if wallet.endswith(' SG') or wallet.endswith(' Pod') or wallet == "Large Grants Pod":
        return pd.DataFrame()
    df['Date'] = pd.to_datetime(df['Date'])
    quarters = df['Date'].apply(get_quarter_end_date).unique()
    interquarter_balances = []

    for quarter_end in quarters:
        quarter_df = df[df['Date'] <= quarter_end]
        for symbol in quarter_df['Symbol'].unique():
            from_balance = quarter_df[(quarter_df['Symbol'] == symbol) & (quarter_df['From_category'] == wallet)]['Value'].sum()
            to_balance = quarter_df[(quarter_df['Symbol'] == symbol) & (quarter_df['To_category'] == wallet)]['Value'].sum()
            net_balance = to_balance + from_balance

            from_usd = quarter_df[(quarter_df['Symbol'] == symbol) & (quarter_df['From_category'] == wallet)]['DOT_USD'].sum()
            to_usd = quarter_df[(quarter_df['Symbol'] == symbol) & (quarter_df['To_category'] == wallet)]['DOT_USD'].sum()
            net_usd = to_usd + from_usd

            if net_balance != 0:
                interquarter_balances.append({
                    'Transaction Hash': 'Interquarter',
                    'Date': quarter_end,
                    'From': wallet,
                    'From_name': wallet,
                    'From_category': wallet,
                    'To': 'Dissolution' if wallet == 'Community WG' else wallet,
                    'To_name': 'Dissolution' if wallet == 'Community WG' else wallet,
                    'To_category': 'Dissolution' if wallet == 'Community WG' else wallet,
                    'Value': 1 if wallet == 'Community WG' else net_balance,
                    'DOT_USD': 1 if wallet == 'Community WG' else net_usd,
                    'Symbol': symbol,
                    'Acquainted?': 1
                })

    return pd.DataFrame(interquarter_balances)

# Function to combine local ledgers, remove duplicates and add interquarter balances
def combine_local_ledgers(local_ledgers_dir, prices_dict, wallets_dict):
    all_files = glob(os.path.join(local_ledgers_dir, '*.csv'), recursive=True)
    combined_df = pd.DataFrame()
    unacquainted_df = pd.DataFrame()

    for file in all_files:
        print(f"Processing file: {file}")
        df = pd.read_csv(file).copy()
        if 'From_category' not in df.columns or 'To_category' not in df.columns:
            print(f"Skipping file due to missing columns: {file}")
            continue 
        df['Date'] = pd.to_datetime(df['Date'])
        df = df[(df['From_category'] != 'WETH Contract') & (df['To_category'] != 'WETH Contract')].copy()

        df = df[~(df['To_name'].str.endswith(' SG') | df['To_name'].str.endswith(' Pod') | df['From_name'].str.endswith(' SG') | df['From_name'].str.endswith(' Pod'))]

        wallet_name = os.path.splitext(os.path.basename(file))[0]
        interquarter_df = calculate_interquarter_balances(df, wallet_name)
        interquarter_df['Thru'] = 'Direct'
        
        df = pd.concat([df, interquarter_df])
        combined_df = pd.concat([combined_df, df])

        temp_unacquainted_df = df[
            ((df['Acquainted?'] == 0) | (df['To_name'] == df['To_category'])) &
            (~df['To_name'].isin(['Ecosystem', 'Metagov', 'Public Goods', 'DAO Wallet', 'Community WG',
                                'Airdrop', 'ENS Labs', 'Community SG', 'CoW WETH Proxy', 'Endowment', 'Dissolution',
                                'Providers', 'Community WG ', 'CoW Swap', 'Invalid Names Ref.', 'Gitcoin Multisig', 'Discretionary',
                                'Ref. Accidental Txs', 'SIWE', 'ETHLimo', 'ENS Fairy', 'Discord Support', 'UniSwap', 'New Registrar',
                                'Giveth', 'Gitcoin Grants']))
        ].copy()
        unacquainted_df = pd.concat([unacquainted_df, temp_unacquainted_df])

    if not unacquainted_df.empty:
        save_dir = os.path.join('..', 'frontend', 'data')
        os.makedirs(save_dir, exist_ok=True)
        unacquainted_df.to_csv(os.path.join(save_dir, 'unknown_contractors.csv'), index=False)
        print(f"Saved {len(unacquainted_df)} unknown transactions to unknown_contractors.csv")
    else:
        print("No unknown transactions found")

    save_dir = os.path.join('..', 'frontend', 'data')
    unacquainted_df.to_csv(os.path.join(save_dir, 'unknown_contractors.csv'), index=False)

    combined_df['Value'] = combined_df['Value'].abs()
    combined_df['DOT_USD'] = combined_df['DOT_USD'].abs()

    combined_df.loc[combined_df['From_name'] == 'Plchld', 'Thru'] = 'Direct'
    combined_df.loc[combined_df['Transaction Hash'] == 'Dissolution', 'Thru'] = 'Direct'

    combined_df = combined_df[combined_df['Acquainted?'] == 1]

    swap_wallets = {name for name, type_, address, *_ in ens_wallets if type_ == 'Swap'}
    combined_df = combined_df[~(combined_df['To_name'].isin(swap_wallets) | combined_df['From_name'].isin(swap_wallets))]

    names_to_remove = ['Token Timelock', 'slobo.eth', 'capitulation.eth', 'Disperse.app', 'ETHGlobal', 'ImmuneFi', 'PG Large Grants Pod']
    combined_df = combined_df[~combined_df['From_name'].isin(names_to_remove)]

    mutual_removes = ['Ecosystem']
    mutual_removes_2 = ['New Registrar']
    combined_df = combined_df[~(combined_df['From_name'].isin(mutual_removes) & combined_df['To_name'].isin(mutual_removes_2))]
    combined_df = combined_df[~(combined_df['To_name'].isin(mutual_removes) & combined_df['From_name'].isin(mutual_removes_2))]

    combined_df = combined_df[~((combined_df['Transaction Hash'] != 'Interquarter') & 
                           (combined_df['Transaction Hash'] != 'Stream') & 
                           combined_df.duplicated(subset=['Transaction Hash', 'From', 'To', 'Value'], keep='first'))]

    combined_df['Quarter'] = combined_df['Date'].apply(add_quarter)

    combined_df = combined_df[combined_df['Quarter'] > '2022Q1']

    invalid_names_ref = combined_df[combined_df['To_category'] == 'Invalid Names Ref.'].copy()
    if not invalid_names_ref.empty:
        aggregated = invalid_names_ref.groupby(['Quarter', 'From', 'From_name', 'From_category']).agg({
            'Date': 'last',
            'Value': 'sum',
            'DOT_USD': 'sum'
        }).reset_index()
        
        aggregated['Transaction Hash'] = 'Refund'
        aggregated['To'] = 'Users'
        aggregated['To_name'] = 'Invalid Names Ref.'
        aggregated['To_category'] = 'Invalid Names Ref.'
        aggregated['Symbol'] = 'USDC'
        aggregated['Acquainted?'] = 1
        
        combined_df = combined_df[combined_df['To_category'] != 'Invalid Names Ref.']
        combined_df = pd.concat([combined_df, aggregated])

    stream_txs = combined_df[combined_df['Transaction Hash'] == 'Stream'].copy()
    if not stream_txs.empty:
        stream_txs['Year-Month'] = stream_txs['Date'].dt.to_period('M')
        aggregated_stream = stream_txs.groupby(['Year-Month', 'To_name', 'From', 'From_name', 'From_category', 
                                                'To', 'To_category', 'Symbol', 'Quarter']).agg({
            'Date': 'last',
            'Value': 'sum',
            'DOT_USD': 'sum'
        }).reset_index()
        
        aggregated_stream['Transaction Hash'] = 'Stream'
        aggregated_stream['Acquainted?'] = 1
        aggregated_stream.drop('Year-Month', axis=1, inplace=True)
        
        combined_df = combined_df[combined_df['Transaction Hash'] != 'Stream']
        combined_df = pd.concat([combined_df, aggregated_stream])

    combined_df.reset_index(drop=True, inplace=True)

    def add_placeholders_for_all_quarters(df):
        wallets = ['DAO Wallet', 'Ecosystem', 'Metagov', 'Public Goods', 'Community WG', 'Providers']
        
        new_rows = []
        for quarter in df['Quarter'].unique():
            quarter_df = df[df['Quarter'] == quarter]
            last_date = quarter_df['Date'].max()
            
            for wallet in wallets:
                new_row = {
                    'Transaction Hash': wallet,
                    'Date': last_date,
                    'From': 'Plchld',
                    'From_name': 'Plchld',
                    'From_category': 'Plchld',
                    'To': 'Plchld',
                    'To_name': 'Plchld',
                    'To_category': 'Plchld',
                    'Value': 1.0 if wallet == 'DAO Wallet' else 0.0,
                    'DOT_USD': 1.0 if wallet == 'DAO Wallet' else 0.0,
                    'Symbol': 'Plchld',
                    'Acquainted?': 'Plchld',
                    'Quarter': quarter
                }
                new_rows.append(new_row)
        
        placeholders_df = pd.DataFrame(new_rows)
        result_df = pd.concat([df, placeholders_df], ignore_index=True)
        return result_df

    combined_df = add_placeholders_for_all_quarters(combined_df)

    def calculate_total_dot_usd(df):
        return df.groupby(['Quarter', 'From_name', 'To_category'])['DOT_USD'].sum().reset_index()

    def sort_key(row, total_dot_usd_df):
        from_name = row['From_name']
        to_name = row['To_name']
        to_category = row['To_category']
        dot_usd = row['DOT_USD']
        transaction_hash = row['Transaction Hash']
        quarter = row['Quarter']
        date = row['Date']
        symbol = row['Symbol']

        def get_total_dot_usd(quarter, from_name, to_category):
            total = total_dot_usd_df[(total_dot_usd_df['Quarter'] == quarter) & 
                                    (total_dot_usd_df['From_name'] == from_name) & 
                                    (total_dot_usd_df['To_category'] == to_category)]['DOT_USD'].sum()
            return -total
        
        wallets_order = ['DAO Wallet', 'Ecosystem', 'Metagov', 'Public Goods', 'Community WG', 'Providers']
        symbol_order = {'ENS': 0, 'ETH': 1, 'USDC': 2}

        if from_name == 'Plchld':
                return (quarter, 0, -dot_usd, date)
        elif transaction_hash == 'Interquarter':
                symbol_priority = symbol_order.get(symbol, len(symbol_order))
                if from_name == 'ENS Multisig' or to_name == 'ENS Multisig':
                    return (quarter, 1, symbol_priority, date)
                elif from_name == 'Root Multisig' or to_name == 'Root Multisig':
                    return (quarter, 4, symbol_priority, date)
                elif from_name == 'DAO Wallet' or to_name == 'DAO Wallet':
                    return (quarter, 7, symbol_priority, date)
                elif from_name == 'Ecosystem' or to_name == 'Ecosystem':
                    return (quarter, 10, symbol_priority, date)
                elif from_name == 'Public Goods' or to_name == 'Public Goods':
                    return (quarter, 13, symbol_priority, date)
                elif from_name == 'Metagov' or to_name == 'Metagov':
                    return (quarter, 16, symbol_priority, date)
                elif from_name == 'Community WG' or to_name == 'Community WG':
                    return (quarter, 19, symbol_priority, date)
                elif from_name == 'Providers' or to_name == 'Providers':
                    return (quarter, 22, symbol_priority, date)
        elif to_name == 'ENS Multisig':
            return (quarter, 2, get_total_dot_usd(quarter, from_name, to_category), date)
        elif from_name == 'ENS Multisig':
            return (quarter, 3, get_total_dot_usd(quarter, from_name, to_category), date)
        elif to_name == 'Root Multisig':
            return (quarter, 5, get_total_dot_usd(quarter, from_name, to_category), date)
        elif from_name == 'Root Multisig':
            return (quarter, 6, get_total_dot_usd(quarter, from_name, to_category), date)
        elif to_name == 'DAO Wallet':
            return (quarter, 8, get_total_dot_usd(quarter, from_name, to_category), date)
        elif from_name == 'DAO Wallet':
            if to_name in ['Ecosystem', 'Public Goods', 'Metagov', 'Community WG', 'Providers']:
                return (quarter, 11 + ['Ecosystem', 'Public Goods', 'Metagov', 'Community WG', 'Providers'].index(to_name) * 3, get_total_dot_usd(quarter, from_name, to_category), date)
            else:
                return (quarter, 9, get_total_dot_usd(quarter, from_name, to_category), date)
        elif from_name == 'Ecosystem':
            return (quarter, 12, get_total_dot_usd(quarter, from_name, to_category), date)
        elif from_name == 'Public Goods':
            return (quarter, 15, get_total_dot_usd(quarter, from_name, to_category), date)
        elif from_name == 'Metagov':
            return (quarter, 18, get_total_dot_usd(quarter, from_name, to_category), date)
        elif from_name == 'Community WG':
            return (quarter, 21, get_total_dot_usd(quarter, from_name, to_category), date)
        elif from_name == 'Providers':
            return (quarter, 24, get_total_dot_usd(quarter, from_name, to_category), date)
        elif from_name == 'Dissolution':
            return (quarter, 26, date)

        return (quarter, 25, get_total_dot_usd(quarter, from_name, to_category), date)

    combined_df['Date'] = pd.to_datetime(combined_df['Date']).dt.date

    total_dot_usd_df = calculate_total_dot_usd(combined_df)
    combined_df['sort_key'] = combined_df.apply(lambda row: sort_key(row, total_dot_usd_df), axis=1)
    combined_df.sort_values(by=['sort_key'], inplace=True)
    combined_df.drop(columns=['sort_key'], inplace=True)

    combined_df.to_csv(os.path.join(save_dir, 'ledger.csv'), index=False)

    return combined_df

# Function for sorting quarterly costs. They are not presented in order of date of execution, but in In descending order of amounts.
def finalize_and_sort_df(grouped_with_unspent_df, folder_name):
    sorted_df = pd.DataFrame()
    quarters = grouped_with_unspent_df['Quarter'].unique()

    for quarter in quarters:
        quarter_data = grouped_with_unspent_df[grouped_with_unspent_df['Quarter'] == quarter].copy()
        if "Unspent" in quarter:
            sorted_df = pd.concat([sorted_df, quarter_data])
        else:
            incoming_transactions = quarter_data[quarter_data['From_category'] != folder_name]
            outgoing_transactions = quarter_data[quarter_data['From_category'] == folder_name]
            incoming_sorted = incoming_transactions.sort_values(by='DOT_USD', ascending=False)
            outgoing_sorted = outgoing_transactions.sort_values(by='DOT_USD', ascending=True)
            sorted_data = pd.concat([incoming_sorted, outgoing_sorted])
            sorted_df = pd.concat([sorted_df, sorted_data])

    return sorted_df

# Main Function. Specifies the rules for working with directories and libraries as well as the order in which functions are performed.
def main(ens_wallets, various_txs):
    raw_data_dir = os.path.join('..', 'scripts', 'data_miner', 'raw_txs')
    local_ledgers_dir = os.path.join('..', 'scripts', 'data_miner', 'local_ledgers')
    os.makedirs(local_ledgers_dir, exist_ok=True)
    quarter_dir = os.path.join('..', 'scripts', 'data_miner', 'quarterly_ledgers')
    os.makedirs(quarter_dir, exist_ok=True)

    wallets_dict = {address: (name, details[0] if len(details) == 1 else name) for name, _, address, *details in ens_wallets}
    txs_dict = {tx[1]: tx[0] for tx in various_txs}
    prices_dict = {pd.to_datetime(date).date(): (ens_price, eth_price) for date, ens_price, eth_price in prices}

    parent_wallets = {}

    for folder in glob(os.path.join(raw_data_dir, '$*'), recursive=True):
        folder_name = os.path.basename(folder).strip('$')
        parent_wallet = get_parent_wallet(folder_name)
        base_category = get_base_category(folder_name)
        
        print(f"Processing folder: {folder_name} (Parent: {parent_wallet}, Base Category: {base_category})")

        token_file = os.path.join(folder, 'token.csv')
        internal_file = os.path.join(folder, 'internal.csv')

        if not os.path.exists(token_file) or not os.path.exists(internal_file):
            print(f"Files not found for {folder_name}")
            continue

        token_df = process_erc20_txs(token_file, prices_dict).copy()
        internal_df = process_internal_txs(internal_file).copy()

        merged_df = merge_txs(token_df, internal_df)
        named_df = identify_wallets(merged_df, wallets_dict, txs_dict, folder_name).copy()

        if folder_name != parent_wallet:
            named_df['To_category'] = named_df.apply(lambda row: 
                base_category if row['Transaction Hash'] not in txs_dict else row['To_category'], axis=1)
            
            named_df['From_name'] = named_df.apply(lambda row:
                row['From_name'] if row['From_name'].endswith('Swap') else parent_wallet, axis=1)
            named_df['From_category'] = named_df.apply(lambda row:
                row['From_category'] if row['From_name'].endswith('Swap') else parent_wallet, axis=1)
            
            named_df['To_category'] = named_df.apply(lambda row:
                parent_wallet if row['From_name'].endswith('Swap') else row['To_category'], axis=1)
            
            named_df['To_name'] = named_df.apply(lambda row: 
                row['To'][:8] if row['Acquainted?'] == 0 else row['To_name'], axis=1)
            named_df['Acquainted?'] = 1
            named_df = named_df[named_df['To_name'] != folder_name]

        if parent_wallet not in parent_wallets:
            parent_wallets[parent_wallet] = named_df
        else:
            parent_wallets[parent_wallet] = pd.concat([parent_wallets[parent_wallet], named_df])

    for parent_wallet, df in parent_wallets.items():
        df = df[~(df['To_name'].str.endswith(' SG') | df['To_name'].str.endswith(' Pod') | df['From_name'].str.endswith(' SG') | df['From_name'].str.endswith(' Pod'))]
        local_ledgers_file = os.path.join(local_ledgers_dir, f'{parent_wallet}.csv')
        df.to_csv(local_ledgers_file, index=False, columns=[col for col in df.columns if col != 'Original_WETH'])

        acquainted_df = df[df['Acquainted?'] == 1].copy()
        cleaned_df = acquainted_df[(acquainted_df['From_category'] != 'WETH Contract') & (acquainted_df['To_category'] != 'WETH Contract')].copy()
        grouped_df = group_by_quarter(cleaned_df)

        unspent_rows_df = add_unspent_balances(grouped_df, prices_dict, parent_wallet)
        grouped_with_unspent_df = pd.concat([grouped_df, unspent_rows_df]).sort_values(by='Quarter')
        final_df = finalize_and_sort_df(grouped_with_unspent_df, parent_wallet)

        grouped_file = os.path.join(quarter_dir, f'{parent_wallet}_q.csv')
        final_df.to_csv(grouped_file, index=False)

    combine_local_ledgers(local_ledgers_dir, prices_dict, wallets_dict)

if __name__ == "__main__":
    main(ens_wallets, various_txs)