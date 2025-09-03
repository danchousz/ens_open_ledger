import pandas as pd
import os
from glob import glob
import sys
sys.path.append(os.path.dirname(__file__))

from utils.data_loading import load_all_data
from services.balance_calculator import calculate_interperiod_balances
from utils.date_parser import get_quarter_end_date

def clean_numeric_value(value):
    """Очищает числовое значение от запятых и символов"""
    if isinstance(value, str):
        return float(value.replace(',', '').replace('$', ''))
    return float(value)

def debug_wallet_balances(wallet_name='Ecosystem'):
    """Отладка балансов для конкретного кошелька"""
    
    print(f"\n{'='*60}")
    print(f"ОТЛАДКА БАЛАНСОВ ДЛЯ: {wallet_name}")
    print(f"{'='*60}\n")
    
    # Загружаем данные
    data = load_all_data()
    
    # Путь к CSV файлам
    raw_data_dir = os.path.join('..', 'scripts', 'data_miner', 'data', 'raw')
    
    # Собираем все транзакции для кошелька
    all_transactions = []
    
    # Адреса кошельков
    wallet_addresses = {
        'Ecosystem': '0x2686a8919df194aa7673244549e68d42c1685d03',
        'DAO Wallet': '0xfe89cc7abb2c4183683ab71653c4cdc9b02d44b7',
        'Metagov': '0x91c32893216de3ea0a55abb9851f581d4503d39b',
        'Public Goods': '0xcd42b4c4d102cc22864e3a1341bb0529c17fd87d',
        'Providers': '0x1d65c6d3ad39d454ea8f682c49ae7744706ea96d'
    }
    
    wallet_address = wallet_addresses.get(wallet_name, '').lower()
    
    # Читаем транзакции из всех папок
    for folder in glob(os.path.join(raw_data_dir, '$*')):
        token_file = os.path.join(folder, 'token.csv')
        if os.path.exists(token_file):
            df = pd.read_csv(token_file)
            
            if wallet_address:
                mask = (df['From'].str.lower() == wallet_address) | (df['To'].str.lower() == wallet_address)
                filtered = df[mask].copy()  # Используем .copy() чтобы избежать warning
                if not filtered.empty:
                    filtered['Folder'] = os.path.basename(folder)
                    all_transactions.append(filtered)
    
    if not all_transactions:
        print("Не найдено транзакций!")
        return
    
    # Объединяем все транзакции
    df = pd.concat(all_transactions, ignore_index=True)
    
    # Преобразуем данные
    df['DateTime (UTC)'] = pd.to_datetime(df['DateTime (UTC)'])
    df['Quarter'] = df['DateTime (UTC)'].apply(lambda d: f"{d.year}Q{(d.month-1)//3+1}")
    
    # Очищаем числовые значения
    df['TokenValue_clean'] = df['TokenValue'].apply(clean_numeric_value)
    
    # Группируем по кварталам и символам
    print("\n1. ТРАНЗАКЦИИ ПО КВАРТАЛАМ:")
    print("-" * 40)
    
    quarters_data = {}
    
    for quarter in sorted(df['Quarter'].unique())[:8]:  # Берем первые 8 кварталов для наглядности
        print(f"\n{quarter}:")
        quarter_df = df[df['Quarter'] == quarter]
        quarters_data[quarter] = {}
        
        for symbol in ['ENS', 'USDC', 'WETH', 'ETH']:
            symbol_df = quarter_df[quarter_df['TokenSymbol'] == symbol]
            if not symbol_df.empty:
                # Входящие
                incoming = symbol_df[symbol_df['To'].str.lower() == wallet_address]
                in_sum = incoming['TokenValue_clean'].sum() if not incoming.empty else 0
                
                # Исходящие  
                outgoing = symbol_df[symbol_df['From'].str.lower() == wallet_address]
                out_sum = outgoing['TokenValue_clean'].sum() if not outgoing.empty else 0
                
                net = in_sum - out_sum
                quarters_data[quarter][symbol] = {'in': in_sum, 'out': out_sum, 'net': net}
                
                if abs(net) > 0.01:  # Показываем только ненулевые
                    print(f"  {symbol:5s}: IN: {in_sum:15.2f} | OUT: {out_sum:15.2f} | NET: {net:15.2f}")
    
    # Считаем накопительные балансы
    print("\n2. НАКОПИТЕЛЬНЫЕ БАЛАНСЫ (как должно быть):")
    print("-" * 40)
    
    cumulative = {}
    for quarter in sorted(df['Quarter'].unique())[:8]:
        quarter_df = df[df['Quarter'] == quarter]
        
        for symbol in ['ENS', 'USDC', 'WETH', 'ETH']:
            if symbol not in cumulative:
                cumulative[symbol] = 0
                
            symbol_df = quarter_df[quarter_df['TokenSymbol'] == symbol]
            if not symbol_df.empty:
                incoming = symbol_df[symbol_df['To'].str.lower() == wallet_address]
                in_sum = incoming['TokenValue_clean'].sum() if not incoming.empty else 0
                
                outgoing = symbol_df[symbol_df['From'].str.lower() == wallet_address]
                out_sum = outgoing['TokenValue_clean'].sum() if not outgoing.empty else 0
                
                period_change = in_sum - out_sum
                cumulative[symbol] += period_change
                
                if abs(cumulative[symbol]) > 0.01:  # Показываем только ненулевые
                    print(f"\n{quarter} - {symbol:5s}:")
                    print(f"  Изменение за период: {period_change:15.2f}")
                    print(f"  Накопленный баланс:  {cumulative[symbol]:15.2f}")
    
    # Сводка
    print("\n3. ИТОГОВЫЕ БАЛАНСЫ НА КОНЕЦ:")
    print("-" * 40)
    for symbol, balance in cumulative.items():
        if abs(balance) > 0.01:
            print(f"{symbol:5s}: {balance:15.2f}")
    
    return quarters_data, cumulative

if __name__ == "__main__":
    # Тестируем Ecosystem
    quarters_data, final_balances = debug_wallet_balances('Ecosystem')
    
    print("\n" + "="*60)
    print("СРАВНЕНИЕ С ОЖИДАЕМЫМ ПОВЕДЕНИЕМ")
    print("="*60)
    print("\nЕсли интерквартальные балансы неправильные, проверьте:")
    print("1. Накапливаются ли остатки от квартала к кварталу?")
    print("2. Учитываются ли транзакции из субкошельков (SG/Pod)?")
    print("3. Правильно ли применяются знаки (+ для входящих, - для исходящих)?")