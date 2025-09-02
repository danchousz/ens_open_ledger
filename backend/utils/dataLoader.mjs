import { csvParse } from 'd3-dsv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ledgerCsvFilePath = path.join(__dirname, '../..', 'frontend', 'data', 'ledger.csv');
const ledgerYearCsvFilePath = path.join(__dirname, '../..', 'frontend', 'data', 'ledger_year.csv');
const unknownCsvFilePath = path.join(__dirname, '../..', 'frontend', 'data', 'unknown_contractors.csv');

let df;
let dfYear;
let dfUnknown;

export function loadData(isYear = false, isUnknown = false) {
    let filePath;
    
    if (isUnknown) {
        filePath = unknownCsvFilePath;
    } else if (isYear) {
        filePath = ledgerYearCsvFilePath;
    } else {
        filePath = ledgerCsvFilePath;
    }
    
    try {
        const csvData = fs.readFileSync(filePath, 'utf8');
        const parsedData = csvParse(csvData);
        const processedData = parsedData.map(row => {
            if (row['Transaction Hash'] === 'Stream') {
                return { ...row, To_category: 'Stream' };
            }
            return row;
        });
        return processedData;
    } catch (error) {
        throw error;
    }
}

export function getData(isYear = false, forceReload = false) {
    if (isYear) {
        if (!dfYear || forceReload) {
            dfYear = loadData(true);
        }
        return dfYear;
    } else {
        if (!df || forceReload) {
            df = loadData();
        }
        return df;
    }
}

export function getUnknown(forceReload = false) {
    if (!dfUnknown || forceReload) {
        dfUnknown = loadData(false, true);
    }
    return dfUnknown;
}

export function reloadData() {
    df = null;
    dfYear = null;
    dfUnknown = null;
    return {
        quarterly: getData(),
        yearly: getData(true),
        unknown: getUnknown()
    };
}