from web3 import Web3
from decimal import Decimal
import json
import sys

import json

ABI = json.loads("""
[
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "start",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "cliff",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "end",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "rate",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "period",
        "type": "uint256"
      }
    ],
    "name": "PlanCreated",
    "type": "event"
  }
]
""")

class NFTAnalyzer:
    def __init__(self, rpc_url: str):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))

    def get_token_info(self, tx_hash: str) -> dict:
        try:
            if not tx_hash.startswith('0x'):
                tx_hash = '0x' + tx_hash
                
            tx_receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            if not tx_receipt:
                return {"error": "Transaction not found"}

            plans = []
            for log in tx_receipt.logs:
                try:
                    contract = self.w3.eth.contract(
                        address=log['address'],
                        abi=ABI
                    )
                    event = contract.events.PlanCreated().process_log(log)
                    if event:
                        amount = Decimal(event['args']['amount']) / Decimal(10**18)
                        plan_info = {
                            "recipient": event['args']['recipient'],
                            "amount": str(amount)
                        }
                        plans.append(plan_info)
                except Exception:
                    continue

            return {"plans": plans}

        except Exception as e:
            return {"error": str(e)}

def process_transaction(tx_hash: str) -> dict:
    RPC_URL = "https://ethereum-rpc.publicnode.com"
    analyzer = NFTAnalyzer(RPC_URL)
    return analyzer.get_token_info(tx_hash)

def main():
    if len(sys.argv) > 1:
        tx_hash = sys.argv[1]
        result = process_transaction(tx_hash)
        print(json.dumps(result))
        sys.stdout.flush()
    else:
        print(json.dumps({"error": "No transaction hash provided"}))
        sys.stdout.flush()

if __name__ == "__main__":
    main()