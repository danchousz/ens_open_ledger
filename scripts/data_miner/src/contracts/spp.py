import pandas as pd
import os
from datetime import datetime, timedelta
import csv

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

def safe_date_parse(date_string):
    for fmt in ('%Y-%m-%d', '%Y-%m-%d %H:%M:%S'):
        try:
            return pd.to_datetime(date_string, format=fmt)
        except ValueError:
            pass
    return pd.NaT

def generate_rows_for_date(date, providers_dict):
    rows = []
    output_date_format = '%Y-%m-%d'

    for recipient, daily_value in providers_dict.items():
        rows.append({
            'Transaction Hash': 'Stream',
            "Blockno": 'dummy',
            'UnixTimestamp': 'dummy',
            'DateTime (UTC)': date.strftime(output_date_format),
            'From': '0x1d65c6d3ad39d454ea8f682c49ae7744706ea96d',
            'To': recipient,
            'TokenValue': daily_value,
            'USDValueDayOfTx': daily_value,
            'ContractAddress': "dummy",
            'TokenName': 'USDC',
            'TokenSymbol': "USDC"
        })
    return rows

def calculate_daily_amounts(annual_amounts):
    daily_amounts = {}
    for name, annual_amount in annual_amounts.items():
        daily_amounts[name] = annual_amount / 365
    return daily_amounts

def main():
    
    raw_file_path = os.path.join('..', 'scripts', 'data_miner', 'data', 'raw', '$Providers', 'token.csv')
    dao_wallet_path = os.path.join('..', 'scripts', 'data_miner', 'data', 'raw', '$DAO Wallet', 'token.csv')

    start_date = datetime(2024, 1, 1)
    end_date = datetime(2026, 1, 1)
    output_date_format = '%Y-%m-%d'

    providers_2024_annual = {
        '0xb352bb4e2a4f27683435f153a259f1b207218b1b': 500000, #ETHLimo
        '0x4dc96aad2daa3f84066f3a00ec41fd1e88c8865a': 600000, #Namehash
        '0xa342bc613803978c7e664f59cec78f437b147854': 700000, #Resolverworks
        '0x000ee9a6bcec9aadcc883bd52b2c9a75fb098991': 300000, #Blockful
        '0x64ca550f78d6cc711b247319cc71a04a166707ab': 400000, #Unruggable
        '0xaaa6e2e683a128b34390b2985b4ae4e7b42935f0': 200000, #Wildcard
        '0xe2cded674643743ec1316858dfd4fd2116932e63': 500000, #EFP
        '0x168cafecfbe97df85968ea039cc11d10a9a44567': 200000, #Namespace
        '0xc8d65e1bd67f16522e3117b980e1c9d2caeb9dc3': 200000  #Unicorn
    }
    
    providers_2025_annual = {
        '0xb352bb4e2a4f27683435f153a259f1b207218b1b': 700000, #ETHLimo
        '0x000ee9a6bcec9aadcc883bd52b2c9a75fb098991': 700000, #Blockful
        '0x4dc96aad2daa3f84066f3a00ec41fd1e88c8865a': 1100000, #Namehash
        '0xe2cded674643743ec1316858dfd4fd2116932e63': 500000, #EFP
        '0x64ca550f78d6cc711b247319cc71a04a166707ab': 400000, #Unruggable
        '0x168cafecfbe97df85968ea039cc11d10a9a44567': 400000, #Namespace
        '0xca07423a99210d1a667b33901deadfaeda687639': 400000, #zkEmail
        '0xdabf4f1f58d9350731e218e25accaf91e0d01d33': 300000  #Justaname
    }
    
    providers_2024_daily = calculate_daily_amounts(providers_2024_annual)
    providers_2025_daily = calculate_daily_amounts(providers_2025_annual)
    
    print("=== 2024 ===")
    for name, annual in providers_2024_annual.items():
        daily = providers_2024_daily[name]
        print(f"{name}: ${annual:,} yearly = ${daily:.2f} daily")

    print("\n=== 2025 ===")
    for name, annual in providers_2025_annual.items():
        daily = providers_2025_daily[name]
        print(f"{name}: ${annual:,} yearly = ${daily:.2f} daily")
    
    columns = [
        "Transaction Hash","Blockno","UnixTimestamp","DateTime (UTC)","From","To","TokenValue","USDValueDayOfTx","ContractAddress","TokenName","TokenSymbol"
    ]
    
    dao_wallet_df = pd.read_csv(dao_wallet_path)
    dao_wallet_df['DateTime (UTC)'] = dao_wallet_df['DateTime (UTC)'].apply(safe_date_parse).dt.strftime(output_date_format)
    providers_rows = dao_wallet_df[dao_wallet_df['To'] == '0x1d65c6d3ad39d454ea8f682c49ae7744706ea96d'].copy()
    providers_rows['TokenValue'] = providers_rows['TokenValue']
    providers_rows['USDValueDayOfTx'] = providers_rows['USDValueDayOfTx']

    new_rows = []
    date_range = pd.date_range(start=start_date, end=end_date - timedelta(days=1))
    
    for date in date_range:
        if date < datetime.now():
            if date.year == 2024:
                new_rows.extend(generate_rows_for_date(date, providers_2024_daily))
            elif date.year == 2025:
                new_rows.extend(generate_rows_for_date(date, providers_2025_daily))

    
    new_df = pd.DataFrame(new_rows, columns=columns)
    final_df = pd.concat([new_df, providers_rows], ignore_index=True)
    
    
    final_df['DateTime (UTC)'] = pd.to_datetime(final_df['DateTime (UTC)'])
    final_df = final_df[
        (final_df['DateTime (UTC)'] >= datetime(2024, 1, 1)) & 
        (final_df['DateTime (UTC)'] < datetime.now())
    ]
    final_df = final_df.sort_values('DateTime (UTC)')
    final_df['DateTime (UTC)'] = final_df['DateTime (UTC)'].dt.strftime(output_date_format)
    final_df = final_df[columns]
    
    final_df.to_csv(raw_file_path, index=False, quoting=csv.QUOTE_ALL)
    
    total_2024 = sum(providers_2024_annual.values())
    total_2025 = sum(providers_2025_annual.values())
    
    print(f"{len(final_df):,} processed")
    print(f"2024: ${total_2024:,} yearly (${total_2024/365:.2f} daily)")
    print(f"2025: ${total_2025:,} yearly (${total_2025/365:.2f} daily)")

if __name__ == "__main__":
    main()