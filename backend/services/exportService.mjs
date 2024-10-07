import { getData } from '../utils/dataLoader.mjs';

export function exportData(view, filter, quarter) {
    const df = getData();
    let filteredDf;

    if (view === 'big_picture') {
        filteredDf = df;
    } else if (view === 'quarter') {
        filteredDf = df.filter(row => row.Quarter === quarter);
    } else if (view === 'wallet') {
        filteredDf = df.filter(row => 
            row.Quarter === quarter && 
            (row.From_name === filter || row.To_name === filter)
        );
    }

    filteredDf.sort((a, b) => new Date(a.Date) - new Date(b.Date));

    return filteredDf;
}