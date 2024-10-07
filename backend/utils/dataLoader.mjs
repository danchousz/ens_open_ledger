import { csvParse } from 'd3-dsv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ledgerCsvFilePath = path.join(__dirname, '../..', 'frontend', 'data', 'ledger.csv');
const unknownContractorsCsvFilePath = path.join(__dirname, '../..', 'frontend', 'data', 'unknown_contractors.csv');

let df;
let unknownContractorsData;

export function loadData() {
    if (!df) {
        try {
            const csvData = fs.readFileSync(ledgerCsvFilePath, 'utf8');
            df = csvParse(csvData);
            df = df.map(row => {
                if (row['Transaction Hash'] === 'Stream') {
                    return { ...row, To_category: 'Stream' };
                }
                return row;
            });
            console.log('Ledger data loaded successfully');
        } catch (error) {
            console.error('Error reading ledger CSV file:', error);
            throw error;
        }
    }
    return df;
}

export function reloadData() {
    df = null;
    return loadData();
}

export function getData() {
    if (!df) {
        return loadData();
    }
    return df;
}

export function loadUnknownContractorsData() {
    if (!unknownContractorsData) {
        try {
            const csvData = fs.readFileSync(unknownContractorsCsvFilePath, 'utf8');
            unknownContractorsData = csvParse(csvData);
            console.log('Unknown contractors data loaded successfully');
        } catch (error) {
            console.error('Error reading unknown contractors CSV file:', error);
            throw error;
        }
    }
    return unknownContractorsData;
}

export function getUnknownContractorsData() {
    if (!unknownContractorsData) {
        return loadUnknownContractorsData();
    }
    return unknownContractorsData;
}