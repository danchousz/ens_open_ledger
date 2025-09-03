import json
import requests
import csv
import os
from datetime import datetime
import pytz
import time
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("ESCAN_API_KEY")

scan_url = 'https://api.etherscan.io/api'
wallets = {
    # Active
    'DAO Wallet': '0xfe89cc7abb2c4183683ab71653c4cdc9b02d44b7',
    'Ecosystem': '0x2686a8919df194aa7673244549e68d42c1685d03',
    'Metagov': '0x91c32893216de3ea0a55abb9851f581d4503d39b',
    'Public Goods': '0xcd42b4c4d102cc22864e3a1341bb0529c17fd87d',
    'IRL SG': '0x536013c57daf01d78e8a70cad1b1abada9411819',
    'Hackathons SG': '0x9b9c249be04dd433c7e8fbbf5e61e6741b89966d',
    'Newsletter SG': '0x13aee52c1c688d3554a15556c5353cb0c3696ea2',
    'Large Grants Pod': '0xeba76c907f02ba13064edad7876fe51d9d856f62'
}

contracts = {
    'ens': '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72',
    'usdc': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    'weth': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
}

def safe_request(url: str, max_retries: int = 3, delay: float = 1.0) -> Optional[Dict[str, Any]]:
    for attempt in range(max_retries):
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            time.sleep(0.21)
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Request failed (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(delay)
            continue
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            print(f"Response text: {response.text}")
            return None
    return None

def fetch_price(ticker: str) -> float:
    try:
        binance_url = f'https://api.binance.com/api/v3/ticker/price?symbol={ticker}'
        data = safe_request(binance_url)
        if data and 'price' in data:
            return float(data['price'])
        return 0.0
    except Exception as e:
        print(f"Error fetching price for {ticker}: {e}")
        return 0.0

def safe_float_conversion(value: str, decimals: int = 18) -> float:
    try:
        return int(value) / 10**decimals
    except (ValueError, TypeError) as e:
        print(f"Error converting value: {e}")
        return 0.0

def convert_timestamp(unix_timestamp: str) -> str:
    try:
        utc_dt = datetime.fromtimestamp(int(unix_timestamp), pytz.UTC)
        return utc_dt.strftime('%Y-%m-%d %H:%M:%S')
    except (ValueError, TypeError) as e:
        print(f"Error converting timestamp: {e}")
        return datetime.now(pytz.UTC).strftime('%Y-%m-%d %H:%M:%S')

def get_last_block() -> int:
    try:
        request = f'{scan_url}?module=proxy&action=eth_blockNumber&apikey={api_key}'
        data = safe_request(request)
        if data and 'result' in data:
            return int(data['result'], 16)
        return 0
    except Exception as e:
        print(f"Error getting last block: {e}")
        return 0

def get_start_block() -> int:
    try:
        with open('../scripts/data_miner/config/last_processed_block.txt', 'r') as f:
            return int(f.read().strip())
    except (FileNotFoundError, ValueError) as e:
        print(f"Error reading start block: {e}")
        return 0

def safe_save_to_csv(file_path: str, data: list, fields: list):
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        mode = 'a' if os.path.exists(file_path) else 'w'
        with open(file_path, mode, newline='') as csvfile:
            csvwriter = csv.writer(csvfile, quoting=csv.QUOTE_ALL)
            if mode == 'w':
                csvwriter.writerow(fields)
            csvwriter.writerows(data)
        return True
    except Exception as e:
        print(f"Error saving to CSV {file_path}: {e}")
        return False

def save_last_block(block: int):
    try:
        with open('../scripts/data_miner/config/last_processed_block.txt', 'w') as f:
            f.write(str(block+1))
    except Exception as e:
        print(f"Error saving last block: {e}")

def get_erc20_txlist(contract_address: str, wallet_address: str, start_block: int, end_block: int) -> Dict[str, Any]:
    try:
        request = f'{scan_url}?module=account&action=tokentx&contractaddress={contract_address}&address={wallet_address}&page=1&offset=10000&startblock={start_block}&endblock={end_block}&sort=asc&apikey={api_key}'
        data = safe_request(request)
        if data is None:
            return {"status": "0", "message": "Failed to fetch data", "result": []}
        return data
    except Exception as e:
        print(f"Error getting ERC20 transactions: {e}")
        return {"status": "0", "message": str(e), "result": []}

def get_internal_txlist(wallet_address: str, start_block: int, end_block: int) -> Dict[str, Any]:
    try:
        request = f'{scan_url}?module=account&action=txlistinternal&address={wallet_address}&startblock={start_block}&endblock={end_block}&page=1&offset=10000&sort=asc&apikey={api_key}'
        data = safe_request(request)
        if data is None:
            return {"status": "0", "message": "Failed to fetch data", "result": []}
        return data
    except Exception as e:
        print(f"Error getting internal transactions: {e}")
        return {"status": "0", "message": str(e), "result": []}

def process_erc20_transaction(tx: Dict[str, Any], wallet_name: str) -> list:
    try:
        value = safe_float_conversion(tx["value"], 6 if tx["tokenSymbol"] == 'USDC' else 18)
        if tx["tokenSymbol"] == 'ENS':
            usdprice = fetch_price('ENSUSDC')
        elif tx["tokenSymbol"] == 'USDC':
            usdprice = 1
        else:
            usdprice = fetch_price('ETHUSDC')
        
        return [
            tx.get("hash", ""),
            tx.get("blockNumber", ""),
            tx.get("timeStamp", ""),
            convert_timestamp(tx.get("timeStamp", "0")),
            tx.get("from", ""),
            tx.get("to", ""),
            value,
            value * usdprice,
            tx.get("contractAddress", ""),
            tx.get("tokenName", ""),
            tx.get("tokenSymbol", "")
        ]
    except Exception as e:
        print(f"Error processing ERC20 transaction: {e}")
        return []

def process_internal_transaction(tx: Dict[str, Any], wallet_name: str) -> list:
    try:
        value = safe_float_conversion(tx["value"])
        usdprice = fetch_price('ETHUSDC')
        
        return [
            tx.get("hash", ""),
            tx.get("blockNumber", ""),
            tx.get("timeStamp", ""),
            convert_timestamp(tx.get("timeStamp", "0")),
            "",
            "",
            "",
            tx.get("from", ""),
            tx.get("to", ""),
            "",
            value if tx["to"] == wallets[wallet_name] else 0,
            0 if tx["to"] == wallets[wallet_name] else value,
            "",
            usdprice,
            "0",
            "",
            ""
        ]
    except Exception as e:
        print(f"Error processing internal transaction: {e}")
        return []

def save_erc20_transactions(data: Dict[str, Any], wallet_name: str):
    fields = ["Transaction Hash", "Blockno", "UnixTimestamp", "DateTime (UTC)", 
             "From", "To", "TokenValue", "USDValueDayOfTx", "ContractAddress", 
             "TokenName", "TokenSymbol"]
    
    file_path = os.path.join('..', 'scripts', 'data_miner', 'data', 'raw', f'${wallet_name}', 'token.csv')
    
    transactions = []
    for tx in data.get("result", []):
        processed_tx = process_erc20_transaction(tx, wallet_name)
        if processed_tx:
            transactions.append(processed_tx)
    
    safe_save_to_csv(file_path, transactions, fields)

def save_internal_transactions(data: Dict[str, Any], wallet_name: str):
    fields = ["Transaction Hash", "Blockno", "UnixTimestamp", "DateTime (UTC)", 
             "ParentTxFrom", "ParentTxTo", "ParentTxETH_Value", "From", "TxTo", 
             "ContractAddress", "Value_IN(ETH)", "Value_OUT(ETH)", 
             "CurrentValue @ $3414.36790970245/Eth", "Historical $Price/Eth", 
             "Status", "ErrCode", "Type"]
    
    file_path = os.path.join('..', 'scripts', 'data_miner', 'data', 'raw', f'${wallet_name}', 'internal.csv')
    
    transactions = []
    for tx in data.get("result", []):
        processed_tx = process_internal_transaction(tx, wallet_name)
        if processed_tx:
            transactions.append(processed_tx)
    
    safe_save_to_csv(file_path, transactions, fields)

def main():
    try:
        start_block = get_start_block()
        end_block = get_last_block()

        if end_block == 0:
            print("Failed to get last block, exiting...")
            return

        print(f"Processing blocks from {start_block} to {end_block}")

        for wallet_name, wallet_address in wallets.items():
            print(f"Processing {wallet_name}...")
            
            for contract_name, contract_address in contracts.items():
                try:
                    data = get_erc20_txlist(contract_address, wallet_address, start_block, end_block)
                    if data['status'] == '1':
                        save_erc20_transactions(data, wallet_name)
                        print(f"ERC20 transactions for {contract_name} saved to ${wallet_name}/token.csv")
                    else:
                        print(f"Error fetching data for contract {contract_name}: {data['message']}")
                except Exception as e:
                    print(f"Error processing contract {contract_name}: {e}")
            
            try:
                internal_data = get_internal_txlist(wallet_address, start_block, end_block)
                if internal_data['status'] == '1':
                    save_internal_transactions(internal_data, wallet_name)
                    print(f"Internal transactions saved to ${wallet_name}/internal.csv")
                else:
                    print(f"Error fetching internal transactions: {internal_data['message']}")
            except Exception as e:
                print(f"Error processing internal transactions: {e}")
            
            print("---")
            time.sleep(0.2)
            
        save_last_block(end_block)
        print(f"Last processed block: {end_block}")

    except Exception as e:
        print(f"Critical error in main function: {e}")

if __name__ == "__main__":
    main()