import json
import requests
import csv
import os
from keys import api_key
from datetime import datetime
import pytz

scan_url = 'https://api.etherscan.io/api'

def get_internal_txlist():
    request = f'{scan_url}?module=account&action=txlistinternal&address=0x91c32893216de3ea0a55abb9851f581d4503d39b&startblock={20614102}&endblock={20614102}&page=1&offset=10000&sort=asc&apikey={api_key}'
    response = requests.get(request)
    return response.json()

data = get_internal_txlist()

# Сохранение данных в JSON файл
with open('internal_txlist.json', 'w') as json_file:
    json.dump(data, json_file, indent=4)

def gettx():

    req = f'https://api.etherscan.io/api?module=account&action=txlistinternal&txhash=0x5fbafba03b490d6ac86e30c5bfbcaa58dc56a4afe4dab7ee1649babb3c745e96&apikey={api_key}'
    response = requests.get(req)
    return response.json()

with open('tx_status.json', 'w') as json_file:
    json.dump(gettx(), json_file, indent=4)