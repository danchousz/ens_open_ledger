import { getData } from '../utils/dataLoader.mjs';

export function getRecipientDetails(recipient, isCategory, isSpecialWallet) {
    const df = getData();
    
    let transactions;
    if (isSpecialWallet) {
        transactions = df.filter(row => 
            row.From_name === recipient && 
            row['Transaction Hash'] !== 'Interquarter' && 
            !row['Transaction Hash'].startsWith('Unspent')
        );
    } else if (isCategory) {
        transactions = df.filter(row => 
            row.To_category === recipient && 
            row['Transaction Hash'] !== 'Interquarter' && 
            !row['Transaction Hash'].startsWith('Unspent')
        );
    } else {
        transactions = df.filter(row => 
            row.To_name === recipient && 
            row['Transaction Hash'] !== 'Interquarter' && 
            !row['Transaction Hash'].startsWith('Unspent')
        );
    }
    
    const summary = {
        ETH: 0,
        USDC: 0,
        ENS: 0,
        total_usd: 0
    };

    transactions.forEach(tx => {
        summary[tx.Symbol] = summary[tx.Symbol] !== 'ETH'
            ? (summary[tx.Symbol] || 0) + Math.round(parseFloat(tx.Value))
            : (summary[tx.Symbol] || 0) + (parseFloat(tx.Value));
        summary.total_usd += Math.round(parseFloat(tx.DOT_USD));
    });

    return {
        transactions: transactions,
        summary: summary
    };
}