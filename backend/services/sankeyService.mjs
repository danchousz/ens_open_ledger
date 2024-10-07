import { getData } from '../utils/dataLoader.mjs';
import { createSankeyData, getNextQuarter } from '../utils/sankeyDataGenerator.mjs';

export function getBigPictureData(hideMode) {
    const df = getData();
    let modifiedDf = JSON.parse(JSON.stringify(df));

    modifiedDf = modifiedDf.map(row => {
        if (row['Transaction Hash'] === 'Unspent') {
            return {
                ...row,
                'Transaction Hash': 'Interquarter',
                To_name: row.From_name,
                To_category: row.From_category,
            }
        }
        return row;
    });
    return createSankeyData(modifiedDf, true, null, null, hideMode);
}

export function getQuarterData(quarter) {
    const df = getData();
    const [year, q] = quarter.split('Q');
    if (parseInt(year) < 2022 || (parseInt(year) === 2022 && parseInt(q) < 2)) {
        throw new Error('Invalid quarter: data not available for quarters before 2022Q2');
    }

    let filteredDf = df.filter(row => {
        if (row.Quarter === quarter) {
            if (row['Transaction Hash'] === 'Interquarter' && row.From_name !== 'Community WG') {
                if (row.From_name !== 'DAO Wallet') {
                    const nextQuarter = getNextQuarter(row.Quarter);
                    row.To_name = `Unspent_${row.From_name}_${nextQuarter}`;
                    row.To_category = `Unspent_${row.From_name}_${nextQuarter}`;
                    row['Transaction Hash'] = 'Unspent';
                    return true;
                }
                return false;
            }
            return true;
        }
        return false;
    });

    return createSankeyData(filteredDf, false, quarter, null);
}

export function getWalletData(quarter, walletFilter) {
    const df = getData();
    let filteredDf = df.filter(row => {
        if (row.Quarter === quarter) {
            if (row['Transaction Hash'] === 'Interquarter') {
                if (row.From_name !== 'DAO Wallet') {
                    row.To_name = `Unspent_${row.From_name}`;
                    row.To_category = `Unspent_${row.From_name}`;
                    row['Transaction Hash'] = 'Unspent';
                    return true;
                }
                return false;
            }
            return true;
        }
        return false;
    });

    filteredDf = filteredDf.filter(row => row.From_category === walletFilter || row.To_category === walletFilter || row['Transaction Hash'] === walletFilter);

    return createSankeyData(filteredDf, false, quarter, walletFilter);
}

export function getCategorySankeyData(category, quarter) {
    const df = getData();
    const filteredData = df.filter(row =>
        row.Quarter === quarter &&
        row.To_category === category
    );

    const nodes = new Set();
    nodes.add(category);

    const groupedData = filteredData.reduce((acc, row) => {
        if (!acc[row.To_name]) {
            acc[row.To_name] = {
                totalValue: 0,
                transactions: []
            };
        }
        acc[row.To_name].totalValue += parseFloat(row.DOT_USD);
        acc[row.To_name].transactions.push(row);
        nodes.add(row.To_name);
        return acc;
    }, {});

    const totalValue = Object.values(groupedData).reduce((sum, group) => sum + group.totalValue, 0);

    const links = [];
    Object.entries(groupedData).forEach(([toName, data]) => {
        data.transactions.forEach(tx => {
            links.push({
                source: category,
                target: toName,
                value: parseFloat(tx.DOT_USD),
                customdata: {
                    date: tx.Date,
                    from: category,
                    to: toName,
                    value: tx.Value,
                    symbol: tx.Symbol,
                    usd: Math.round(tx.DOT_USD),
                    receipt: tx['Transaction Hash']
                }
            });
        });
    });

    const colorMap = {
        'USDC': '#5294e2',
        'ETH': '#b97cf3',
        'ENS': '#5ac8fa'
    };

    const sankeyData = [{
        type: "sankey",
        orientation: "h",
        arrangement: "fixed",
        node: {
            pad: 15,
            thickness: 30,
            line: {
                color: "grey",
                width: 0.5
            },
            label: Array.from(nodes).map((node, index) => {
                if (index === 0) return node;
                const nodeValue = groupedData[node].totalValue;
                const percentage = ((nodeValue / totalValue) * 100).toFixed(1);
                return `${percentage}% - ${node}`;
            }),
            color: Array.from(nodes).map((node, index) => 
                'white'
            ),
            customdata: Array.from(nodes).map(node => ({ 
                account: node === category ? "N/A" : "recipient",
                totalValue: node === category ? totalValue : groupedData[node].totalValue
            })),
            hovertemplate: '%{label}<br>Total Value: %{customdata.totalValue:.2f} USD<extra></extra>',
        },
        link: {
            source: links.map(link => Array.from(nodes).indexOf(link.source)),
            target: links.map(link => Array.from(nodes).indexOf(link.target)),
            value: links.map(link => link.value),
            color: links.map(link => colorMap[link.customdata.symbol] || 'grey'),
            customdata: links.map(link => link.customdata),
            hovertemplate: 'To %{customdata.to}<br>Amount: %{customdata.value} %{customdata.symbol}<br>USD: %{customdata.usd}<extra></extra>',
            hoverlabel: {align: "left", bordercolor: "white", bgcolor: "white", font: {color: "black", size: 14, family: "Satoshi"}},
        }
    }];

    const layout = {
        paper_bgcolor: 'white',
        plot_bgcolor: 'white',
    };

    return { data: sankeyData, layout: layout };
}