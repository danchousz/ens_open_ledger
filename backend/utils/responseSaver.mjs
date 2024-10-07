import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../..', 'scripts', 'data_miner', 'uc_responses.json');

export function saveTransaction(transactionData, callback) {
    fs.readFile(filePath, 'utf8', (err, fileContent) => {
        let data = [];
        if (!err) {
            try {
                data = JSON.parse(fileContent);
            } catch (parseError) {
                console.error('Error parsing existing file:', parseError);
            }
        }

        data.push(transactionData);

        fs.writeFile(filePath, JSON.stringify(data, null, 2), (writeErr) => {
            if (writeErr) {
                console.error('Error saving transaction:', writeErr);
                callback(writeErr);
            } else {
                console.log('Data saved:', transactionData);
                callback(null, { message: "Transaction saved successfully" });
            }
        });
    });
}