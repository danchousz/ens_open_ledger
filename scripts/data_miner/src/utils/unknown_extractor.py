import pandas as pd

def extract_unknown_contractors(all_transactions):
    unknown_df = pd.DataFrame()
    
    for df in all_transactions:
        temp_unknown = df[
            ((df['Acquainted?'] == 0) | (df['To_name'] == df['To_category'])) &
            (~df['To_name'].isin(['Ecosystem', 'Metagov', 'Public Goods', 'DAO Wallet', 'Community WG',
                                'Airdrop', 'ENS Labs', 'Community SG', 'CoW WETH Proxy', 'WETH Contract', 'Endowment', 'Dissolution',
                                'Providers', 'Community WG ', 'CoW Swap', 'Invalid Names Ref.', 'Gitcoin Multisig', 'Discretionary',
                                'Ref. Accidental Txs', 'SIWE', 'ETHLimo', 'ENS Fairy', 'Discord Support', 'UniSwap', 'Registrar',
                                'Giveth', 'Gitcoin Grants', 'TWAP', 'Hedgey Finance']))
        ].copy()
        unknown_df = pd.concat([unknown_df, temp_unknown])
    
    return unknown_df