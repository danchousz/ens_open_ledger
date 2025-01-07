import pandas as pd
import os
from datetime import datetime, timedelta

def add_quarter(date):
    month = date.month
    if month < 4:
        return f'{date.year} Q1'
    elif month < 7:
        return f'{date.year} Q2'
    elif month < 10:
        return f'{date.year} Q3'
    else:
        return f'{date.year} Q4'

def group_by_quarter(df):
    df['Date'] = pd.to_datetime(df['Date'])
    df['Quarter'] = df['Date'].apply(add_quarter)
    grouped = df.groupby(['Quarter', 'From', 'To', 'Symbol'], as_index=False).agg({'Value': 'sum', 'DOT_USD': 'sum'})
    return grouped

local_file_path = os.path.join('..', 'scripts', 'data_miner', 'local_ledgers', 'Providers.csv')
quarterly_path = os.path.join('..', 'scripts', 'data_miner', 'quarterly_ledgers', 'Providers_q.csv')
dao_wallet_path = os.path.join('..', 'scripts', 'data_miner','local_ledgers', 'DAO Wallet.csv')

initial_start_date = datetime(2024, 1, 1)
current_date = datetime.now()
output_date_format = '%Y-%m-%d' 

providers = {
    'ETHLimo': 1369.8625,
    'Namehash': 1643.835,
    'Resolverworks': 1917.8075,
    'Blockful': 821.9175,
    'Unruggable': 1095.89,
    'Wildcard': 547.945,
    'EFP': 1369.8625,
    'Namespace': 547.945,
    'Unicorn': 547.945
}

columns = ['Transaction Hash', 'Date', 'From', 'From_name', 'From_category', 'To', 'To_name', 'To_category', 'Value', 'DOT_USD', 'Symbol', 'Acquainted?']

def safe_date_parse(date_string):
    for fmt in ('%Y-%m-%d', '%Y-%m-%d %H:%M:%S'):
        try:
            return pd.to_datetime(date_string, format=fmt)
        except ValueError:
            pass
    return pd.NaT 

dao_wallet_df = pd.read_csv(dao_wallet_path)
dao_wallet_df['Date'] = dao_wallet_df['Date'].apply(safe_date_parse).dt.strftime(output_date_format)
providers_rows = dao_wallet_df[dao_wallet_df['To_name'] == 'Providers'].copy()
providers_rows['Value'] = providers_rows['Value'].abs() 
providers_rows['DOT_USD'] = providers_rows['DOT_USD'].abs() 

def generate_rows_for_date(date):
    rows = []
    for recipient, value in providers.items():
        rows.append({
            'Transaction Hash': 'Stream',
            'Date': date.strftime(output_date_format),
            'From': 'Providers',
            'From_name': 'Providers',
            'From_category': 'Providers',
            'To': recipient,
            'To_name': recipient,
            'To_category': 'Stream',
            'Value': -value, 
            'DOT_USD': -value, 
            'Symbol': 'USDC',
            'Acquainted?': 1
        })
    return rows


new_rows = []
date_range = pd.date_range(start=initial_start_date, end=datetime(2025, 1, 1) - timedelta(days=1))
for date in date_range:
    new_rows.extend(generate_rows_for_date(date))


new_df = pd.DataFrame(new_rows, columns=columns)
final_df = pd.concat([new_df, providers_rows])
final_df['Date'] = pd.to_datetime(final_df['Date'])

final_df = final_df[(final_df['Date'] >= datetime(2024, 1, 1)) & (final_df['Date'] < datetime(2025, 1, 1))]
final_df = final_df.sort_values('Date')
final_df['Date'] = final_df['Date'].dt.strftime(output_date_format)
final_df = final_df[columns]


final_df.to_csv(local_file_path, index=False)

grouped_df = group_by_quarter(final_df)
grouped_df.to_csv(quarterly_path, index=False)

print(f"Processed {len(final_df)} rows. Data saved to {local_file_path} and {quarterly_path}")