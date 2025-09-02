import pandas as pd
from services.balance_calculator import calculate_interperiod_balances
from services.contract_handler import (
    process_hedgey_transactions,
    process_scholarship_transactions,
    add_special_transactions
)
from utils.date_parser import add_quarter

def process_all_transactions(all_transactions, data, is_year=False):
    if not all_transactions:
        print("No transactions provided")
        return pd.DataFrame()
    
    period_name = "yearly" if is_year else "quarterly"
    print(f"Processing {period_name} transactions...")
    
    combined_df = pd.concat(all_transactions, ignore_index=True)
    
    special_df = add_special_transactions()
    combined_df = pd.concat([combined_df, special_df], ignore_index=True)
    
    combined_df["_abs_value"] = combined_df["Value"].abs()
    duplicate_mask = (
        (combined_df['Transaction Hash'] != 'Interquarter') &
        (combined_df['Transaction Hash'] != 'Inter-year') &
        (combined_df['Transaction Hash'] != 'Stream') &
        (combined_df['Transaction Hash'] != 'Dissolution') &
        (combined_df['Transaction Hash'] != 'Interwallet') &
        (~combined_df['Transaction Hash'].isin(data['ignore_duplicates'])) &
        combined_df.duplicated(subset=['Transaction Hash', 'From', 'To', 'Symbol', '_abs_value'], keep='first')
    )
    combined_df = combined_df[~duplicate_mask]
    combined_df = combined_df.drop(columns=["_abs_value"])
    
    wallets = ['DAO Wallet', 'Ecosystem', 'Metagov', 'Public Goods', 'Community WG', 'Providers']
    interperiod_dfs = []
    
    for wallet in wallets:
        wallet_df = combined_df[
            (combined_df['From_category'] == wallet) | 
            (combined_df['To_category'] == wallet)
        ].copy()
        
        if not wallet_df.empty:
            interperiod_hash = 'Inter-year' if is_year else 'Interquarter'
            wallet_df = wallet_df[wallet_df['Transaction Hash'] != interperiod_hash]
            interperiod_df = calculate_interperiod_balances(wallet_df, wallet, data, is_year)
            if not interperiod_df.empty:
                interperiod_dfs.append(interperiod_df)
    
    if interperiod_dfs:
        all_interperiod = pd.concat(interperiod_dfs, ignore_index=True)
        combined_df = pd.concat([combined_df, all_interperiod], ignore_index=True)
    
    combined_df = combined_df[(combined_df['From_name'] != 'WETH Contract') & 
                              (combined_df['To_name'] != 'WETH Contract')]
    
    combined_df = combined_df[~(combined_df['To_name'].str.endswith(' SG') | 
                                combined_df['To_name'].str.endswith(' Pod') | 
                                combined_df['From_name'].str.endswith(' SG') | 
                                combined_df['From_name'].str.endswith(' Pod'))]
    
    combined_df = combined_df[~(combined_df['To_name'].isin(data['swap_wallets']) | 
                                combined_df['From_name'].isin(data['swap_wallets']))]
    
    names_to_remove = ['Token Timelock', 'slobo.eth', 'capitulation.eth', 'Disperse.app', 
                       'ETHGlobal', 'ImmuneFi', 'PG Large Grants Pod']
    combined_df = combined_df[~combined_df['From_name'].isin(names_to_remove)]
    
    combined_df = combined_df[~((combined_df['From_name'] == 'Registrar') & 
                                (combined_df['To_name'] == 'Ecosystem'))]
    
    mask = (combined_df['From_name'] == 'Ecosystem') & (combined_df['To_name'] == 'Registrar')
    combined_df.loc[mask, 'To_name'] = 'Registrar'
    combined_df.loc[mask, 'To_category'] = 'Names Renewal'
    
    aexek_mask = (combined_df['To_name'] == 'aexek.eth') & (combined_df['Thru'] == 'IRL SG')
    combined_df.loc[aexek_mask, 'To_category'] = 'POAPs'
    
    combined_df['Date'] = pd.to_datetime(combined_df['Date'])
    if is_year:
        combined_df['Quarter'] = combined_df['Date'].dt.year.astype(str)
        combined_df = combined_df[combined_df['Quarter'] > '2021']
    else:
        combined_df['Quarter'] = combined_df['Date'].apply(add_quarter)
        combined_df = combined_df[combined_df['Quarter'] > '2022Q1']
    
    combined_df = process_hedgey_transactions(combined_df, data)
    combined_df = process_scholarship_transactions(combined_df)
    
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
        aggregated['Symbol'] = 'ETH'
        aggregated['Acquainted?'] = 1
        aggregated['Thru'] = 'Direct'
        
        combined_df = combined_df[combined_df['To_category'] != 'Invalid Names Ref.']
        combined_df = pd.concat([combined_df, aggregated])
    
    stream_txs = combined_df[combined_df['Transaction Hash'] == 'Stream'].copy()
    if not stream_txs.empty:
        period_column = 'Y' if is_year else 'M'
        stream_txs['Year-Period'] = stream_txs['Date'].dt.to_period(period_column)
        aggregated_stream = stream_txs.groupby(['Year-Period', 'To_name', 'From', 'From_name', 'From_category', 
                                                'To', 'To_category', 'Symbol', 'Quarter']).agg({
            'Date': 'last',
            'Value': 'sum',
            'DOT_USD': 'sum'
        }).reset_index()
        
        aggregated_stream['Transaction Hash'] = 'Stream'
        aggregated_stream['Acquainted?'] = 1
        aggregated_stream.drop('Year-Period', axis=1, inplace=True)
        
        combined_df = combined_df[combined_df['Transaction Hash'] != 'Stream']
        combined_df = pd.concat([combined_df, aggregated_stream])
    
    combined_df = combined_df[combined_df['Acquainted?'] == 1]
    
    combined_df = add_placeholders(combined_df, is_year)
    
    combined_df = sort_transactions(combined_df, is_year)
    
    combined_df['Value'] = combined_df['Value'].abs()
    combined_df['DOT_USD'] = combined_df['DOT_USD'].abs()
    
    combined_df['Date'] = combined_df['Date'].dt.date
    
    return combined_df

def add_placeholders(df, is_year=False):
    wallets = ['DAO Wallet', 'Ecosystem', 'Public Goods', 'Metagov', 'Community WG', 'Providers']
    
    period_column = 'Quarter' 
    
    new_rows = []
    for period in df[period_column].unique():
        period_df = df[df[period_column] == period]
        last_date = period_df['Date'].max()
        
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
                'Quarter': period,
                'Thru': 'Direct'
            }
            new_rows.append(new_row)
    
    placeholders_df = pd.DataFrame(new_rows)
    return pd.concat([df, placeholders_df], ignore_index=True)

def sort_transactions(df, is_year=False):
    def calculate_total_dot_usd(df):
        return df.groupby(['Quarter', 'From_name', 'To_category'])['DOT_USD'].sum().reset_index()

    def sort_key(row, total_dot_usd_df, is_year=False):
        from_name = row['From_name']
        to_name = row['To_name']
        to_category = row['To_category']
        dot_usd = float(row['DOT_USD'])
        transaction_hash = row['Transaction Hash']
        quarter = row['Quarter']
        date = row['Date']
        symbol = row['Symbol']

        def get_total_dot_usd(quarter, from_name, to_category):
            total = total_dot_usd_df[(total_dot_usd_df['Quarter'] == quarter) & 
                                    (total_dot_usd_df['From_name'] == from_name) & 
                                    (total_dot_usd_df['To_category'] == to_category)]['DOT_USD'].sum()
            return float(total)
        
        symbol_order = {'ENS': 0, 'ETH': 1, 'USDC': 2}
        interperiod_hash = 'Interquarter'

        if from_name == 'Plchld':
            return (quarter, 0, -float(dot_usd), date)
        elif transaction_hash == interperiod_hash:
            symbol_priority = symbol_order.get(symbol, len(symbol_order))
            if from_name == 'ENS Multisig' or to_name == 'ENS Multisig':
                return (quarter, 1, symbol_priority, float(dot_usd), date)
            elif from_name == 'Root Multisig' or to_name == 'Root Multisig':
                return (quarter, 4, symbol_priority, float(dot_usd), date)
            elif from_name == 'DAO Wallet' or to_name == 'DAO Wallet':
                return (quarter, 7, symbol_priority, float(dot_usd), date)
            elif from_name == 'Ecosystem' or to_name == 'Ecosystem':
                return (quarter, 10, symbol_priority, float(dot_usd), date)
            elif from_name == 'Public Goods' or to_name == 'Public Goods':
                return (quarter, 13, symbol_priority, float(dot_usd), date)
            elif from_name == 'Metagov' or to_name == 'Metagov':
                return (quarter, 16, symbol_priority, float(dot_usd), date)
            elif from_name == 'Community WG' or to_name == 'Community WG':
                return (quarter, 19, symbol_priority, float(dot_usd), date)
            elif from_name == 'Providers' or to_name == 'Providers':
                return (quarter, 22, symbol_priority, float(dot_usd), date)
        elif to_name == 'ENS Multisig':
            return (quarter, 2, get_total_dot_usd(quarter, from_name, to_category), dot_usd, date)
        elif from_name == 'ENS Multisig':
            return (quarter, 3, get_total_dot_usd(quarter, from_name, to_category), dot_usd, date)
        elif to_name == 'Root Multisig':
            return (quarter, 5, get_total_dot_usd(quarter, from_name, to_category), dot_usd, date)
        elif from_name == 'Root Multisig':
            return (quarter, 6, get_total_dot_usd(quarter, from_name, to_category), dot_usd, date)
        elif to_name == 'DAO Wallet':
            return (quarter, 8, get_total_dot_usd(quarter, from_name, to_category), dot_usd, date)
        elif from_name == 'DAO Wallet':
            if to_name in ['Ecosystem', 'Public Goods', 'Metagov', 'Community WG', 'Providers']:
                return (quarter, 11 + ['Ecosystem', 'Public Goods', 'Metagov', 'Community WG', 'Providers'].index(to_name) * 3, 
                        get_total_dot_usd(quarter, from_name, to_category), dot_usd, date)
            else:
                return (quarter, 9, get_total_dot_usd(quarter, from_name, to_category), float(dot_usd), date)
        elif from_name == 'Ecosystem':
            return (quarter, 12, get_total_dot_usd(quarter, from_name, to_category), dot_usd, date)
        elif from_name == 'Public Goods':
            return (quarter, 15, get_total_dot_usd(quarter, from_name, to_category), dot_usd, date)
        elif from_name == 'Metagov':
            return (quarter, 18, get_total_dot_usd(quarter, from_name, to_category), dot_usd, date)
        elif from_name == 'Community WG':
            return (quarter, 21, get_total_dot_usd(quarter, from_name, to_category), dot_usd, date)
        elif from_name == 'Providers':
            return (quarter, 24, get_total_dot_usd(quarter, from_name, to_category), dot_usd, date)
        elif from_name == 'Dissolution':
            return (quarter, 26, dot_usd, date)

        return (quarter, 25, get_total_dot_usd(quarter, from_name, to_category), dot_usd, date)

    total_dot_usd_df = calculate_total_dot_usd(df)
    df['sort_key'] = df.apply(lambda row: sort_key(row, total_dot_usd_df, is_year), axis=1)
    df.sort_values(by=['sort_key'], ascending=True, inplace=True)
    df.drop(columns=['sort_key'], inplace=True)
    
    return df