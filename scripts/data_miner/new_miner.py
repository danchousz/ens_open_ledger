import json
import requests
import csv
import os
from keys import api_key
from datetime import datetime
import pytz

scan_url = 'https://api.etherscan.io/api'
wallets = {
    'DAO Wallet': '0xfe89cc7abb2c4183683ab71653c4cdc9b02d44b7',
    'Ecosystem': '0x2686a8919df194aa7673244549e68d42c1685d03',
    'Metagov': '0x91c32893216de3ea0a55abb9851f581d4503d39b',
    'Public Goods': '0xcd42b4c4d102cc22864e3a1341bb0529c17fd87d'
}
contracts = {
    'ens': '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72',
    'usdc': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    'weth': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
}

def fetch_price(ticker):
    binance_url = f'https://api.binance.com/api/v3/ticker/price?symbol={ticker}'
    response = requests.get(binance_url)
    price_data = response.json()
    return float(price_data['price'])

ens_price = fetch_price('ENSUSDC')
eth_price = fetch_price('ETHUSDC')

def convert_timestamp(unix_timestamp):
    utc_dt = datetime.fromtimestamp(int(unix_timestamp), pytz.UTC)
    return utc_dt.strftime('%Y-%m-%d %H:%M:%S')

def get_last_block():
    request = f'{scan_url}?module=proxy&action=eth_blockNumber&apikey={api_key}'
    response = requests.get(request)
    last_block = int(json.loads(response.text)['result'], 16)
    return last_block

def get_start_block():
    try:
        with open('../scripts/data_miner/last_processed_block.txt', 'r') as f:
            return int(f.read().strip())
    except FileNotFoundError:
        return 0

def save_last_block(block):
    with open('../scripts/data_miner/last_processed_block.txt', 'w') as f:
        f.write(str(block+1))

def get_erc20_txlist(contract_address, wallet_address, start_block, end_block):
    request = f'{scan_url}?module=account&action=tokentx&contractaddress={contract_address}&address={wallet_address}&page=1&offset=10000&startblock={start_block}&endblock={end_block}&sort=asc&apikey={api_key}'
    response = requests.get(request)
    return response.json()

def get_internal_txlist(wallet_address, start_block, end_block):
    request = f'{scan_url}?module=account&action=txlistinternal&address={wallet_address}&startblock={start_block}&endblock={end_block}&page=1&offset=10000&sort=asc&apikey={api_key}'
    response = requests.get(request)
    return response.json()

def save_erc20_transactions(data, wallet_name):
    fields = ["Transaction Hash", "Blockno", "UnixTimestamp", "DateTime (UTC)", "From", "To", "TokenValue", "USDValueDayOfTx", "ContractAddress", "TokenName", "TokenSymbol"]
    file_path = os.path.join('..', 'scripts', 'data_miner', 'raw_txs', f'${wallet_name}', 'token.csv')
    
    mode = 'a' if os.path.exists(file_path) else 'w'
    with open(file_path, mode, newline='') as csvfile:
        csvwriter = csv.writer(csvfile, quoting=csv.QUOTE_ALL)
        if mode == 'w':
            csvwriter.writerow(fields)
        
        for tx in data["result"]:
            value = int(tx["value"])/10**6 if tx["tokenSymbol"] == 'USDC' else int(tx["value"])/10**18
            if tx["tokenSymbol"] == 'ENS':
                usdprice = ens_price
            elif tx["tokenSymbol"] == 'USDC':
                usdprice = 1
            else:
                usdprice = eth_price
            csvwriter.writerow([
                tx["hash"],
                tx["blockNumber"],
                tx["timeStamp"],
                convert_timestamp(tx["timeStamp"]),
                tx["from"],
                tx["to"],
                value,
                value*usdprice,
                tx["contractAddress"],
                tx["tokenName"],
                tx["tokenSymbol"]
            ])

def save_internal_transactions(data, wallet_name):
    fields = ["Transaction Hash","Blockno","UnixTimestamp","DateTime (UTC)","ParentTxFrom","ParentTxTo","ParentTxETH_Value","From","TxTo","ContractAddress","Value_IN(ETH)","Value_OUT(ETH)","CurrentValue @ $3414.36790970245/Eth","Historical $Price/Eth","Status","ErrCode","Type"]
    file_path = os.path.join('..', 'scripts', 'data_miner', 'raw_txs', f'${wallet_name}', 'internal.csv')
    
    mode = 'a' if os.path.exists(file_path) else 'w'
    with open(file_path, mode, newline='') as csvfile:
        csvwriter = csv.writer(csvfile, quoting=csv.QUOTE_ALL)
        if mode == 'w':
            csvwriter.writerow(fields)
        
        for tx in data["result"]:
            value = int(tx["value"])/10**18
            usdprice = eth_price
            csvwriter.writerow([
                tx["hash"],
                tx["blockNumber"],
                tx["timeStamp"],
                convert_timestamp(tx["timeStamp"]),
                "",
                "",
                "",
                tx["from"],
                tx["to"],
                "",
                value if tx["to"] == wallets[wallet_name] else 0,
                0 if tx["to"] == wallets[wallet_name] else value,
                "",
                usdprice,
                "0",
                "",
                ""
            ])

def main():
    start_block = get_start_block()
    end_block = get_last_block()

    print(f"Processing blocks from {start_block} to {end_block}")

    for wallet_name, wallet_address in wallets.items():
        print(f"Processing {wallet_name}...")
        
        for contract_name, contract_address in contracts.items():
            data = get_erc20_txlist(contract_address, wallet_address, start_block, end_block)
            if data['status'] == '1':
                save_erc20_transactions(data, wallet_name)
                print(f"ERC20 transactions for {contract_name} saved to ${wallet_name}/token.csv")
            else:
                print(f"Error fetching data for contract {contract_name}: {data['message']}")
        
        internal_data = get_internal_txlist(wallet_address, start_block, end_block)
        if internal_data['status'] == '1':
            save_internal_transactions(internal_data, wallet_name)
            print(f"Internal transactions saved to ${wallet_name}/internal.csv")
        else:
            print(f"Error fetching internal transactions: {internal_data['message']}")
        
        print("---")

    save_last_block(end_block)
    print(f"Last processed block: {end_block}")

if __name__ == "__main__":
    main()