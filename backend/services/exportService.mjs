import { getData } from '../utils/dataLoader.mjs';

export function exportData(view, filter, quarter) {
    const df = getData();
    let filteredDf;

    if (view === 'big_picture') {
        filteredDf = df.filter(row => row['Transaction Hash'] !== 'Interquarter');
    } else if (view === 'quarter') {
        filteredDf = df.filter(row => row.Quarter === quarter && row['Transaction Hash'] !== 'Unspent');
    } else if (view === 'wallet') {
        filteredDf = df.filter(row => 
            row.Quarter === quarter && 
            (row.From_name === filter || row.To_name === filter)
            && row['Transaction Hash'] !== 'Unspent'
        );
    }

    filteredDf.sort((a, b) => new Date(a.Date) - new Date(b.Date));

    return filteredDf;
}