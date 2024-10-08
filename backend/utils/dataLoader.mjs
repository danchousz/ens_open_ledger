import { csvParse } from 'd3-dsv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ledgerCsvFilePath = path.join(__dirname, '../..', 'frontend', 'data', 'ledger.csv');
const ledgerYearCsvFilePath = path.join(__dirname, '../..', 'frontend', 'data', 'ledger_year.csv');
const unknownContractorsCsvFilePath = path.join(__dirname, '../..', 'frontend', 'data', 'unknown_contractors.csv');

let df;
let dfYear;
let unknownContractorsData;

export function loadData(isYear = false) {
    const filePath = isYear ? ledgerYearCsvFilePath : ledgerCsvFilePath;
    try {
        const csvData = fs.readFileSync(filePath, 'utf8');
        const parsedData = csvParse(csvData);
        const processedData = parsedData.map(row => {
            if (row['Transaction Hash'] === 'Stream') {
                return { ...row, To_category: 'Stream' };
            }
            return row;
        });
        console.log(`${isYear ? 'Yearly' : 'Quarterly'} ledger data loaded successfully`);
        return processedData;
    } catch (error) {
        console.error(`Error reading ${isYear ? 'yearly' : 'quarterly'} ledger CSV file:`, error);
        throw error;
    }
}

export function getData(isYear = false) {
    if (isYear) {
        if (!dfYear) {
            dfYear = loadData(true);
        }
        return dfYear;
    } else {
        if (!df) {
            df = loadData();
        }
        return df;
    }
}

export function reloadData() {
    df = null;
    dfYear = null;
    return {
        quarterly: getData(),
        yearly: getData(true)
    };
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