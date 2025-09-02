import pandas as pd

from utils.date_parser import get_quarter_end_date

def calculate_interperiod_balances(df, wallet, data, is_year=False):

    if wallet.endswith(' SG') or wallet.endswith(' Pod') or wallet == "Large Grants Pod":
        return pd.DataFrame()
    
    df = df.copy()
    df['Date'] = pd.to_datetime(df['Date'])
    
    if is_year:
        df['Period'] = df['Date'].dt.year
        period_end_func = lambda year: pd.Timestamp(f"{year}-12-31").date()
        quarter_func = lambda year: str(year)
        transaction_hash = 'Interquarter'
    else:
        df['Period'] = df['Date'].apply(get_quarter_end_date)
        period_end_func = lambda x: x.date() if hasattr(x, 'date') else x
        quarter_func = lambda date: f"{date.year}Q{(date.month - 1) // 3 + 1}"
        transaction_hash = 'Interquarter'
    
    periods = sorted(df['Period'].unique())
    interperiod_balances = []
    
    for period_end in periods:

        period_df = df[df['Period'] <= period_end]
        
        for symbol in ['ENS', 'ETH', 'USDC']:
            
            from_txs = period_df[
                (period_df['Symbol'] == symbol) & 
                (period_df['From_category'] == wallet)
            ]
            
            from_balance = 0
            from_usd = 0
            if not from_txs.empty:
                from_values = from_txs['Value'].apply(lambda x: -abs(x))
                from_balance = from_values.sum()
                from_usd = from_txs['DOT_USD'].apply(lambda x: -abs(x)).sum()
            
            to_txs = period_df[
                (period_df['Symbol'] == symbol) & 
                (period_df['To_category'] == wallet)
            ]
            
            to_balance = 0
            to_usd = 0
            if not to_txs.empty:
                to_values = to_txs['Value'].apply(lambda x: abs(x))
                to_balance = to_values.sum()
                to_usd = to_txs['DOT_USD'].apply(lambda x: abs(x)).sum()
            
            net_balance = to_balance + from_balance
            
            if abs(net_balance) < 0.01:
                continue
            
            period_date = period_end_func(period_end)
            net_usd = to_usd + from_usd
            
            if wallet == 'Community WG':
                to_entity = 'Dissolution'
                display_value = 1
                display_usd = 1
            else:
                to_entity = wallet
                display_value = net_balance
                display_usd = net_usd
            
            interperiod_balances.append({
                'Transaction Hash': transaction_hash,
                'Date': period_date,
                'From': wallet,
                'From_name': wallet,
                'From_category': wallet,
                'To': to_entity,
                'To_name': to_entity,
                'To_category': to_entity,
                'Value': display_value,
                'DOT_USD': display_usd,
                'Symbol': symbol,
                'Acquainted?': 1,
                'Thru': 'Direct',
                'Quarter': quarter_func(period_end)
            })
    
    return pd.DataFrame(interperiod_balances)