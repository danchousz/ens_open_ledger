import pandas as pd

def add_quarter(date):
    year, month, day = date.year, date.month, date.day
    if year == 2022:
        if (month < 3) or (month == 3 and day < 31):
            return f'{year}Q1'
        elif (month == 3 and day == 31) or (month > 3 and month < 7):
            return f'{year}Q2'
        elif (month > 6 and month < 10):
            return f'{year}Q3'
        else:
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

def get_period_end_price(period_end, symbol, prices_dict):
    if symbol == 'USDC':
        return 1.0
    
    target_date = period_end.date() if hasattr(period_end, 'date') else period_end
    
    available_dates = sorted(prices_dict.keys())
    closest_date = None
    
    for date in available_dates:
        if date <= target_date:
            closest_date = date
        else:
            break
    
    if closest_date is None and available_dates:
        closest_date = available_dates[0]
    
    if closest_date:
        price_index = 0 if symbol == 'ENS' else 1
        return prices_dict[closest_date][price_index]
    
    return 0