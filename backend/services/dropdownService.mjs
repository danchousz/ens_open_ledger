import { getData } from '../utils/dataLoader.mjs';

export function getContractorsData(category, quarter, sender) {
    const df = getData();

    let filteredData = df.filter(row =>
        row.Quarter === quarter &&
        row.To_category === category
    );

    if (sender) {
        filteredData = filteredData.filter(row => row.From_name === sender);
    }

    const contractorsData = filteredData.reduce((acc, row) => {
        const key = row.To_name;
        if (!acc[key]) {
            acc[key] = { value: 0, thru: row.Thru || 'Direct' };
        }
        acc[key].value += parseFloat(row.DOT_USD);
        return acc;
    }, {});

    const result = Object.entries(contractorsData).map(([name, data]) => ({
        name,
        value: Math.round(data.value),
        thru: data.thru
    }));

    result.sort((a, b) => b.value - a.value);

    return result;
}