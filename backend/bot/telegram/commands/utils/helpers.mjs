import fs from 'fs';
import path from 'path';
import _ from 'lodash';

export const filterTransactions = (data, isDetails) => {
    return data.filter(tx => {
        const hash = tx['Transaction Hash'];
        const to_category = tx['To_category'];
        const from_category = tx['From_category'];
        const sortingMode = isDetails 
            ? ['Interquarter', 'Unspent', 'Plchld', 'Stream',
                'Ecosystem', 'Metagov', 'Public Goods', 'DAO Wallet', 
                'Community WG', 'Providers']
            : ['Interquarter', 'Unspent', 'Plchld', 
                'Ecosystem', 'Metagov', 'Public Goods', 'DAO Wallet', 
                'Community WG', 'Providers']

        return !sortingMode.includes(hash)
        && !['Airdrop', 'CoW Swap', 'UniSwap'].includes(to_category)
        && !['Airdrop', 'CoW Swap', 'UniSwap'].includes(from_category);
    });
};

export const formatTransaction = (tx) => {
    const directMessage = tx.Thru === 'Direct' ? 'directly ' : '';
    const indirectMessage = tx.Thru !== 'Direct' ? ` via ${tx.Thru}` : '';

    const formattedAmount = tx.symbol === 'USDC'
                        ? Math.round(tx.amount)
                        : Math.round(tx.amount * 1000) / 1000;

    const dotusdMessage = tx.symbol === 'USDC'
                        ? ''
                        : `($${Math.round(tx.dot_usd)}) `;
    
    const categoryMessage = tx.category === tx.to_name 
                        ? ''
                        : `within the category ${tx.category}`;
    
    const etherscanLink = `[View on Etherscan](https://etherscan.io/tx/${tx.hash})`;
    const ledgerLink = tx.to_name !== 'DAO Wallet'
                    ? `[${tx.to_name}](https://ens-ledger.app/?details=${tx.to_name})`
                    : tx.to_name;

    return `\n*${tx.date}*: ${tx.from_name} ${directMessage}sent ${formattedAmount} ${tx.symbol} ${dotusdMessage}to ${ledgerLink} ${categoryMessage}${indirectMessage}\n${etherscanLink}\n`;
};

export const safeNumber = (value) => {
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value;
    return isNaN(num) ? 0 : num;
};

export const prepareDetailedStats = async (transactions) => {
    const safeNumber = (value) => {
        const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value;
        return isNaN(num) ? 0 : num;
    };

    const assetTotals = _.groupBy(transactions, 'Symbol');
    const assetSummary = {};
    
    for (const [symbol, txs] of Object.entries(assetTotals)) {
        assetSummary[symbol] = _.sumBy(txs, tx => safeNumber(tx.Value));
    }

    const dates = transactions.map(tx => new Date(tx.Date));
    const firstTransaction = new Date(Math.min(...dates));
    const lastTransaction = new Date(Math.max(...dates));

    const workingGroups = _.groupBy(transactions, 'From_name');
    const workingGroupStats = {};
    
    for (const [group, txs] of Object.entries(workingGroups)) {
        workingGroupStats[group] = {
            count: txs.length,
            total: _.sumBy(txs, tx => safeNumber(tx.DOT_USD))
        };
    }

    const categories = _.groupBy(transactions, 'To_category');
    const categoryStats = {};
    
    for (const [category, txs] of Object.entries(categories)) {
        categoryStats[category] = {
            count: txs.length,
            total: _.sumBy(txs, tx => safeNumber(tx.DOT_USD))
        };
    }
    
    const totalValue = _.sumBy(transactions, tx => safeNumber(tx.DOT_USD));

    return {
        assetSummary,
        firstTransaction,
        lastTransaction,
        workingGroupStats,
        categoryStats,
        totalUSDValue: totalValue,
        transactionCount: transactions.length
    };
};

export const formatDetailedMessage = async (recipientName, stats) => {
    const formatDate = (date) => date.toISOString().split('T')[0];
    const formatNumber = (num) => Number(num || 0).toFixed(2);
    const formatCurrency = (num) => new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num || 0);

    const assetLines = Object.entries(stats.assetSummary)
        .filter(([_, amount]) => amount > 0)
        .map(([symbol, amount]) => `\n• ${formatNumber(amount)} ${symbol}`)
        .join();

    const workingGroupLines = Object.entries(stats.workingGroupStats)
        .filter(([_, data]) => data.total > 0 || data.count > 0)
        .map(([group, data]) => 
            `• ${group}: ${data.count} txs, ${formatCurrency(data.total)}`
        )
        .join('\n');

    const categoryLines = Object.entries(stats.categoryStats)
        .filter(([_, data]) => data.total > 0 || data.count > 0)
        .map(([category, data]) => 
            `• ${category}: ${data.count} txs, ${formatCurrency(data.total)}`
        )
        .join('\n');

    const message = `📊 *${recipientName}*

💰 *Total Value Received:* ${formatCurrency(stats.totalUSDValue)}`;

    const assetsSection = assetLines ? `\n\n📦 *Assets Breakdown:*${assetLines}` : '';
    const activitySection = `\n\n📅 *Activity Period:*
- First Transaction: ${formatDate(stats.firstTransaction)}
- Last Transaction: ${formatDate(stats.lastTransaction)}
- Total Transactions: ${stats.transactionCount}`;

    const workingGroupsSection = workingGroupLines ? `\n\n👥 *Source Working Groups:*\n${workingGroupLines}` : '';
    const categoriesSection = categoryLines ? `\n\n🔗 *Category Distribution:*\n${categoryLines}` : '';
    const ledgerLink = `\n\n[ENS Ledger](https://ens-ledger.app/?details=${recipientName})`;

    return message + assetsSection + activitySection + workingGroupsSection + categoriesSection + ledgerLink;
};

export const findAvatar = async (recipientName) => {
    const avatarFolders = [
        '../frontend/components/avatars/parsed_avatars',
        '../frontend/components/avatars/static_avatars'
    ];
    const formats = ['webp', 'svg', 'png', 'gif', 'jpg'];
    
    for (const folder of avatarFolders) {
        for (const format of formats) {
            const avatarPath = path.join(folder, `${recipientName}.${format}`);
            try {
                await fs.promises.access(avatarPath);
                return avatarPath;
            } catch (error) {
                continue;
            }
        }
    }
    return null;
};