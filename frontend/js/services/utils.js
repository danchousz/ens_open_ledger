export function getEtherscanLink(hash, address) {
    if (hash) {
        return `https://etherscan.io/tx/${hash}`
    } else {
        return `https://etherscan.io/address/${address}`
    }
}

export function formatValue(value, min, max, abbr) {
    if (abbr) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'k';
        } else {
            return value.toString();
        }
    } else {
        return parseFloat(value).toLocaleString('en-US', {
            minimumFractionDigits: min,
            maximumFractionDigits: max
        });
    }
}

export function groupDataByField(transactions, field) {
    const groupedData = {};
    transactions.forEach(tx => {
        const key = tx[field];
        if (!groupedData[key]) {
            groupedData[key] = 0;
        }
        groupedData[key] += parseFloat(tx.DOT_USD);
    });
    return groupedData;
}

export function getMonthRange(quarterIndex) {
    switch(parseInt(quarterIndex)) {
        case 1: return 'Jan-Mar';
        case 2: return 'Apr-Jun';
        case 3: return 'Jul-Sep';
        case 4: return 'Oct-Dec';
        default: return '';
    }
}

export function getYear(quarterIndex) {
    if (quarterIndex <= 3) {
        return 2022;
    }
    const baseYear = 2022;
    const yearOffset = Math.floor(quarterIndex / 4);
    return baseYear + yearOffset;
}

export function formatSumIfNonZero(sum, symbol) {
    if (sum === 0) return '';
    return `${formatValue(sum, null, null, true)} ${symbol}`;
}