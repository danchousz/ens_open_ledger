import pandas as pd
import os

def process_erc20_txs(token_file, data):
    df = pd.read_csv(token_file)

    col_to_remove = ['Blockno', 'UnixTimestamp', 'ContractAddress', 'TokenName']
    df.drop(columns=col_to_remove, inplace=True)

    col_to_rename = {
        'DateTime (UTC)': 'Date',
        'TokenValue': 'Value',
        'USDValueDayOfTx': 'DOT_USD',
        'TokenSymbol': 'Symbol'
    }
    df.rename(columns=col_to_rename, inplace=True)

    df = df[df['Symbol'].isin(['WETH', 'USDC', 'ENS'])]
    df['Original_WETH'] = df['Symbol'] == 'WETH'
    df['Symbol'] = df['Symbol'].replace({'WETH': 'ETH'})
    df['Value'] = pd.to_numeric(df['Value'].astype(str).replace(r'[\$,]', '', regex=True), errors='coerce')
    df['DOT_USD'] = pd.to_numeric(df['DOT_USD'].astype(str).replace(r'[\$,]', '', regex=True), errors='coerce')
    df['Date'] = pd.to_datetime(df['Date']).dt.date

    df.loc[df['Symbol'] == 'USDC', 'DOT_USD'] = df.loc[df['Symbol'] == 'USDC', 'Value']

    df = df[~df['Transaction Hash'].isin(data['bad_hashes'])]

    for index, row in df.iterrows():
        if pd.isna(row['DOT_USD']):
            date = row['Date']
            value = row['Value']
            symbol = row['Symbol']
            if symbol == 'USDC':
                df.at[index, 'DOT_USD'] = value
            elif symbol in ['ETH', 'ENS']:
                price = data['prices_dict'].get(date, (0, 0))[0 if symbol == 'ENS' else 1]
                df.at[index, 'DOT_USD'] = value * price

    return df

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

def merge_and_clean_txs(df1, df2):
    merged_df = pd.concat([df1, df2])
    merged_df['Date'] = pd.to_datetime(merged_df['Date'])
    merged_df.sort_values(by='Date', inplace=True)

    merged_df = merged_df[
        (merged_df['Value'] != 0) &
        ~((merged_df['Symbol'] == 'USDC') & 
        (merged_df['Value'] <= 11)) &
        (merged_df['From'] != merged_df['To'])
    ]

    return merged_df