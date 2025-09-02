import subprocess
import json
import pandas as pd
import os

def process_hedgey_transactions(df, data):
    hedgey_mask = df['To_name'] == 'Hedgey Finance'
    hedgey_txs = df[hedgey_mask].copy()
    non_hedgey_txs = df[~hedgey_mask].copy()

    print(f"Found {len(hedgey_txs)} Hedgey transactions")

    if len(hedgey_txs) > 0:
        print("Unpacking Hedgey NFT contracts...")

    result_rows = []
    for _, tx in hedgey_txs.iterrows():
        try:
            script_path = os.path.abspath(os.path.join(
                os.path.dirname(__file__), '..', 'contracts', 'hedgey.py'))

            result = subprocess.run(
                f"python3 '{script_path}' '{tx['Transaction Hash']}'",
                shell=True,
                capture_output=True,
                text=True,
                check=True
            )

            hedgey_data = json.loads(result.stdout)
            
            for plan in hedgey_data['plans']:
                recipient_address = plan['recipient']
                amount = float(plan['amount'])

                recipient_name = None
                for address, (name, details) in data['wallets_dict'].items():
                    if address.lower() == recipient_address.lower():
                        recipient_name = details if details != name else name
                        break

                if not recipient_name:
                    recipient_name = data['txs_dict'].get(tx['Transaction Hash'], recipient_address[:8])

                new_dot_usd = (tx['DOT_USD'] / abs(tx['Value'])) * amount

                new_row = tx.copy()
                new_row.update({
                    'To': recipient_address.lower(),
                    'To_name': recipient_name,
                    'To_category': '$ENS Distribution',
                    'Value': amount,
                    'DOT_USD': new_dot_usd
                })
                result_rows.append(new_row)

        except subprocess.CalledProcessError as e:
            print(f"Error processing Hedgey transaction {tx['Transaction Hash']}: {e}")
            print(f"Command stderr: {e.stderr}")
            continue
        except Exception as e:
            print(f"Unexpected error processing Hedgey transaction {tx['Transaction Hash']}: {e}")
            continue

    if result_rows:
        hedgey_processed = pd.DataFrame(result_rows)
        print(f"Processed {len(hedgey_processed)} Hedgey transactions")
        return pd.concat([non_hedgey_txs, hedgey_processed], ignore_index=True)

    return non_hedgey_txs

def process_scholarship_transactions(df):
    scholarship_mask = df['To_category'] == 'Scholarship'
    non_scholarship_txs = df[~scholarship_mask].copy()
    scholarship_txs = df[scholarship_mask].copy()
    
    result_rows = []
    
    for _, tx in scholarship_txs.iterrows():
        tx_hash = tx['Transaction Hash']
        
        if tx_hash == '0x11bf109a0989c151aea7da5494e641ba215307e83a43480c56af785fe8b6eb5d':
            recipients = [
                ('0x1c98ec38126965ad2e732f7f66f03c18ca4a9ece', 'lcfr.eth'),
                ('0x87c02352ad720889e5b5fbb541ff162da6690019', 'albertocevallos.eth'),
                ('0x07590a393c67670463b80768feed264832541d51', 'cookbookdev.eth'),
                ('0x81ebe8ee7b51741fd5dad31f6987e626a9bb8111', 'hellenstans.eth'),
                ('0x60583563d5879c2e59973e5718c7de2147971807', 'carletex.eth'),
                ('0x8f73be66ca8c79382f72139be03746343bf5faa0', 'mihal.eth'),
            ]
            
            for address, name in recipients:
                new_row = tx.copy()
                new_row.update({
                    'To': address,
                    'To_name': name,
                    'To_category': 'Scholarship',
                    'Value': tx['Value'] / 6,
                    'DOT_USD': tx['DOT_USD'] / 6,
                })
                result_rows.append(new_row)
    
    if result_rows:
        scholarship_processed = pd.DataFrame(result_rows)
        return pd.concat([non_scholarship_txs, scholarship_processed], ignore_index=True)
    
    return non_scholarship_txs

def add_special_transactions():
    dissolution_records = [
        {
            'Transaction Hash': 'Dissolution',
            'Date': pd.to_datetime('2022-07-01').date(),
            'From': 'Community WG',
            'From_name': 'Community WG',
            'From_category': 'Community WG',
            'To': 'Ecosystem',
            'To_name': 'Ecosystem',
            'To_category': 'Ecosystem',
            'Value': 486,
            'DOT_USD': 4332,
            'Symbol': 'ENS',
            'Acquainted?': 1,
            'Thru': 'Direct',
            'Quarter': '2022Q3'
        },
        {
            'Transaction Hash': 'Dissolution',
            'Date': pd.to_datetime('2022-07-01').date(),
            'From': 'Community WG',
            'From_name': 'Community WG',
            'From_category': 'Community WG',
            'To': 'Ecosystem',
            'To_name': 'Ecosystem',
            'To_category': 'Ecosystem',
            'Value': 54000,
            'DOT_USD': 54000,
            'Symbol': 'USDC',
            'Acquainted?': 1,
            'Thru': 'Direct',
            'Quarter': '2022Q3'
        },
        {
            'Transaction Hash': 'Interwallet',
            'Date': pd.to_datetime('2024-01-08').date(),
            'From': 'Bug Bounty',
            'From_name': 'Bug Bounty',
            'From_category': 'Bug Bounty',
            'To': 'Metagov',
            'To_name': 'Metagov',
            'To_category': 'Metagov',
            'Value': 14000,
            'DOT_USD': 14000,
            'Symbol': 'USDC',
            'Acquainted?': 1,
            'Thru': 'Direct',
            'Quarter': '2024Q1'
        }
    ]
    
    return pd.DataFrame(dissolution_records)