import json
import requests
import csv
import os
from keys import api_key
from datetime import datetime
import pytz

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

    # Temp/const inactive
    # 'Merch SG': '0x0d06a817584ac378849f03df6f11a9ad67dd786d',
    # 'Builders SG': '0x6a016548310076285668e2378df70bd545396b5a',
    # 'Translators SG': '0xe8929029ea54113da91cdb8c9c1ba297cf803838',
    # 'Websites SG': '0x593a50cf05359bc88474d86b06ec6e1c1a2a899f',
    # 'Docs SG': '0x5d609c79c7e19aa334d77517b3b17a3dac6f54bc',
    # 'Gitcoin Grants SG': '0xba0c461b22d918fb1f52fef556310230d177d1f2',
    # 'Support SG': '0x69a79128462853833e22bba1a43bcdac4725761b',
    # 'Bug Bounty SG': '0xb3a37c813d3d365a03dd1dd3e68cc11af019cdd6',
    # 'Governance Pod': '0x4f4cadb8af8f1d463240c2b93952d8a16688a818',
     # 'DAO Tooling Pod': '0x8f730f4ac5fd234df9993e0e317f07e44fb869c1',
    # 'Endowment Fees Pod': '0x83dd97a584c4ad50015f7aa6b48bf4970a056d8f',
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