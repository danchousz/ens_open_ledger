def get_parent_wallet(folder_name):
    if folder_name.endswith(' SG'):
        return 'Ecosystem'
    elif folder_name == "Large Grants Pod":
        return 'Public Goods'
    elif folder_name.endswith(' Pod'):
        return 'Metagov'
    elif folder_name == 'Support SG (pre-dissolve)':
        return 'Community WG'
    else:
        return folder_name

def get_base_category(folder_name):
    if folder_name.endswith(' SG'):
        return folder_name.rsplit(' ', 1)[0]
    elif folder_name == "Large Grants Pod":
        return "PG Large Grants"
    elif folder_name.endswith(' Pod'):
        return folder_name.rsplit(' ', 1)[0]
    elif folder_name == 'Support SG (pre-dissolve)':
        return 'Support'
    else:
        return folder_name

def identify_wallets(df, data, folder_name):
    wallets_dict = data['wallets_dict']
    txs_dict = data['txs_dict']

    def replace_on_match(to, from_address, txhash):
        if txhash in txs_dict:
            if folder_name == from_address:
                return txs_dict[txhash], from_address
            else:
                return to, txs_dict[txhash]
        return to, from_address
    
    def check_acquaintance(row):
        from_known = any(row['From_category'] == wallet_category for wallet_category, _ in wallets_dict.values()) or row['From_category'] in txs_dict.values()
        to_known = any(row['To_category'] == wallet_category for wallet_category, _ in wallets_dict.values()) or row['To_category'] in txs_dict.values()
        return 1 if from_known and to_known else 0
    
    df['From_category'] = df['From'].apply(lambda address: 
                    wallets_dict.get(address.lower(), (address, address))[0])
    df['To_category'] = df['To'].apply(lambda address:
                    wallets_dict.get(address.lower(), (address, address))[0])
    df['From_name'] = df['From'].apply(lambda address:
                    wallets_dict.get(address.lower(), (address, address))[1])
    df['To_name'] = df['To'].apply(lambda address: 
                    wallets_dict.get(address.lower(), (address, address))[1])

    df[['To_category', 'From_category']] = df.apply(lambda row: replace_on_match
                                  (row['To_category'], row['From_category'], row.get('Transaction Hash', '')), axis=1, result_type='expand')

    df['From_name'] = df.apply(lambda row: 
                    row['From_category'] if row['From_name'] == row['From'] else row['From_name'], axis=1)
    df['To_name'] = df.apply(lambda row: 
                    row['To_category'] if row['To_name'] == row['To'] else row['To_name'], axis=1)
    df['Acquainted?'] = df.apply(check_acquaintance, axis=1)

    df['To_category'] = df.apply(lambda row: 
                                row['To_name'][:-3] if row['To_name'].endswith(' SG') and row['To_category'] == row['To_name']
                                 else row['To_name'][:-4] if row['To_name'].endswith(' Pod') and row['To_category'] == row['To_name']
                                 else row['To_name'] if row['To_category'] == row['To']
                                 else row['To_category'], axis=1)
    if folder_name == "Large Grants Pod":
        df = df[df['To_name'] != 'Public Goods']
        df = df[df['From_name'] != 'Public Goods']
        df['To_category'] = df.apply(lambda row: 
            row['To_category'] if row['To_name'].endswith('Swap') else
            "PG Large Grants" if row['Transaction Hash'] not in txs_dict else 
            row['To_category'], axis=1)
        
        cow_mask = df['From_name'] == 'CoW'
        swap_mask = df['From_name'].str.endswith('Swap')
        
        df.loc[cow_mask | swap_mask, ['To_name', 'To_category']] = 'Public Goods'
        df.loc[~(cow_mask | swap_mask), ['From_name', 'From_category']] = 'Public Goods'
        
        df.loc[~(cow_mask | swap_mask), 'Value'] = -abs(df.loc[~(cow_mask | swap_mask), 'Value'])
        df.loc[~(cow_mask | swap_mask), 'DOT_USD'] = -abs(df.loc[~(cow_mask | swap_mask), 'DOT_USD'])
    elif folder_name.endswith(' SG'):
        df = df[df['To_name'] != 'Ecosystem']
        df = df[df['From_name'] != 'Ecosystem']
        base_category = folder_name.rsplit(' ', 1)[0]
        df['To_category'] = df.apply(lambda row: 
            row['To_category'] if row['To_name'].endswith('Swap') else
            base_category if row['Transaction Hash'] not in txs_dict else 
            row['To_category'], axis=1)
        
        cow_mask = df['From_name'] == 'CoW'
        swap_mask = df['From_name'].str.endswith('Swap')
        inter_wg_send = df['To_name'] == 'Metagov'
        
        df.loc[cow_mask | swap_mask, ['To_name', 'To_category']] = 'Ecosystem'
        df.loc[~(cow_mask | swap_mask), ['From_name', 'From_category']] = 'Ecosystem'
        df.loc[inter_wg_send, ['To_name', 'To_category']] = 'Metagov'
        
        df.loc[~(cow_mask | swap_mask), 'Value'] = -abs(df.loc[~(cow_mask | swap_mask), 'Value'])
        df.loc[~(cow_mask | swap_mask), 'DOT_USD'] = -abs(df.loc[~(cow_mask | swap_mask), 'DOT_USD'])
    elif folder_name.endswith(' Pod'):
        df = df[df['To_name'] != 'Metagov']
        df = df[df['From_name'] != 'Metagov']
        base_category = folder_name.rsplit(' ', 1)[0]
        df['To_category'] = df.apply(lambda row: 
            row['To_category'] if row['To_name'].endswith('Swap') else
            base_category if row['Transaction Hash'] not in txs_dict else 
            row['To_category'], axis=1)
        
        cow_mask = df['From_name'] == 'CoW'
        swap_mask = df['From_name'].str.endswith('Swap')
        
        df.loc[cow_mask | swap_mask, ['To_name', 'To_category']] = 'Metagov'
        df.loc[~(cow_mask | swap_mask), ['From_name', 'From_category']] = 'Metagov'
        
        df.loc[~(cow_mask | swap_mask), 'Value'] = -abs(df.loc[~(cow_mask | swap_mask), 'Value'])
        df.loc[~(cow_mask | swap_mask), 'DOT_USD'] = -abs(df.loc[~(cow_mask | swap_mask), 'DOT_USD'])
    elif folder_name == 'Support SG (pre-dissolve)':
        df = df[df['To_name'] != 'Community WG']
        df = df[df['From_name'] != 'Community WG']
        df['To_category'] = df.apply(lambda row: 
            row['To_category'] if row['To_name'].endswith('Swap') else
            'Support' if row['Transaction Hash'] not in txs_dict else 
            row['To_category'], axis=1)
        
        cow_mask = df['From_name'] == 'CoW'
        swap_mask = df['From_name'].str.endswith('Swap')
        
        df.loc[cow_mask | swap_mask, ['To_name', 'To_category']] = 'Community WG'
        df.loc[~(cow_mask | swap_mask), ['From_name', 'From_category']] = 'Community WG'
        
        df.loc[~(cow_mask | swap_mask), 'Value'] = -abs(df.loc[~(cow_mask | swap_mask), 'Value'])
        df.loc[~(cow_mask | swap_mask), 'DOT_USD'] = -abs(df.loc[~(cow_mask | swap_mask), 'DOT_USD'])

    if folder_name.endswith(' SG') or folder_name.endswith(' Pod') or folder_name == "Large Grants Pod":
        df = df.copy()
        df['To_name'] = df.apply(lambda row: 
            row['To'][:8] if row['Acquainted?'] == 0 else row['To_name'], axis=1)
        df['Acquainted?'] = 1
        df = df[df['To_name'] != folder_name]

    mask = (
        (df['From_category'] == folder_name) &
        ((df['Symbol'].isin(['USDC', 'ENS']))
        | (df['Original_WETH']))
    )
    df.loc[mask, ['Value', 'DOT_USD']] *= -1

    df['Thru'] = folder_name if folder_name != get_parent_wallet(folder_name) else 'Direct'
    df = apply_specific_fixes(df)

    df = df.reindex(columns=['Transaction Hash', 'Date', 'From', 'From_name', 'From_category', 'To', 'To_name', 'To_category', 'Value', 'DOT_USD', 'Symbol', 'Acquainted?', 'Thru'])

    return df

def apply_specific_fixes(df):
    specific_names = {
        '0x6629454d3365f2f6717dce07ab79a423c544a842436cba5c9f846227e40424df': 'premm.eth',
        '0xb07500c4d7dcfce1924db68324f103dccd7be6273ad4fabc87dc0e0e8910e5ad': 'premm.eth',
        '0x81b6b744ff95090b9d2727e7d5b6c9301e643a9de8305377011c2c5a4f11084a': 'Providers',
        '0xcdb37683ee78536c1cbc9e190dfa5805ce408e4fa1182235b400fd54f2b36ed9': 'Hackathons SG',
        '0x2930846bf5fe2844d4a5d280ae54753a6265f2f75b576945fdd268fc863b43e9': 'Community SG',
        '0x1d16ce36118f0903c89a856661083a017524e4e8d9225b87948cb21e993e4377': 'Gitcoin Multisig',
    }
    specific_cats = {
        '0x81b6b744ff95090b9d2727e7d5b6c9301e643a9de8305377011c2c5a4f11084a': 'Providers',
        '0x2930846bf5fe2844d4a5d280ae54753a6265f2f75b576945fdd268fc863b43e9': 'Community SG',
    }
    specific_wallets = {
        '0x9b9c249be04dd433c7e8fbbf5e61e6741b89966d': 'Hackathons SG',
    }
    specific_senders = {
        '0x9bf05272c1debfd466109f0dc99f6aac323934ee04b92a8cffb8720ff8bbf0c1': 'Dissolved Community WG',
        '0xf40e1c129ab1d20576a4a6776b16624e0a7d08d492b2433a214127e45584121d': 'Dissolved Community WG',
        '0x1c59f0b0a7e14f4422afe3aaeed210da036c15c1570a0a1549019f4b62aa983e': 'Dissolved Community WG',
    }
    specific_senders_cats = {
        '0x9bf05272c1debfd466109f0dc99f6aac323934ee04b92a8cffb8720ff8bbf0c1': 'Dissolved Community WG',
        '0xf40e1c129ab1d20576a4a6776b16624e0a7d08d492b2433a214127e45584121d': 'Dissolved Community WG',
        '0x1c59f0b0a7e14f4422afe3aaeed210da036c15c1570a0a1549019f4b62aa983e': 'Dissolved Community WG',
    }

    for hash_value, to_name in specific_names.items():
        df.loc[df['Transaction Hash'] == hash_value, 'To_name'] = to_name

    for hash_value, to_category in specific_cats.items():
        df.loc[df['Transaction Hash'] == hash_value, 'To_category'] = to_category

    for to, to_name in specific_wallets.items():
        df.loc[df['To'] == to, 'To_name'] = to_name

    for hash_value, from_name in specific_senders.items():
        df.loc[df['Transaction Hash'] == hash_value, 'From_name'] = from_name
    
    for hash_value, from_category in specific_senders_cats.items():
        df.loc[df['Transaction Hash'] == hash_value, 'From_category'] = from_category

    df.loc[(df['Transaction Hash'] == '0x15b33f26832e8c7eb39448e94ddd13b48e73c22df414e1b9d55dabc1df540b2d') & 
        (df['To'] == '0xa19a7ae868ede64c6c5256a64bcd3bf3a9f2d615'), 'To_name'] = 'cryptowork.eth'

    df.loc[(df['Transaction Hash'] == '0x8ba0d6e261677400f68261543a8b10ea0fe20ad797e31f0ff17b2d8a1cf2a19e') & 
        (df['To'] == '0x7f7720bdb2cb5c13dd30a0c8ab8d0dd553b31caa'), 'To_category'] = 'DAO Tooling'
    
    df.loc[(df['Transaction Hash'] == '0x5286750eec05cdbc885a64ff62deb0fe7a6f0206f8cd1800c9a97825ac629d63') & 
        (df['To'] == '0x7f7720bdb2cb5c13dd30a0c8ab8d0dd553b31caa'), 'To_category'] = 'Research'
    
    df.loc[(df['Transaction Hash'] == '0x8ba0d6e261677400f68261543a8b10ea0fe20ad797e31f0ff17b2d8a1cf2a19e') & 
        ((df['To'] == '0xe52c39327ff7576baec3dbfef0787bd62db6d726') | (df['To'] == '0x60dbf50076206f60bcc2edf9295f5734561b8d77')), 'To_category'] = 'IRL'
    
    df.loc[(df['Transaction Hash'] == '0x8ba0d6e261677400f68261543a8b10ea0fe20ad797e31f0ff17b2d8a1cf2a19e') & 
        (df['To'] == '0x0b48f961776bb4678b7a4fcf0711f3e86949f72b'), 'To_category'] = 'Governance'
    
    df = df[df['From_name'] != 'Dissolved Community WG']
    df.loc[df['To_name'] == 'Ashu', 'To_category'] = 'Support'

    return df