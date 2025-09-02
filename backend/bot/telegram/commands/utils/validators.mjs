export function isValidEthereumAddress(address) {
    if (!address || typeof address !== 'string') {
        return false;
    }
    
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
}

export function isValidTransactionHash(hash) {
    if (!hash || typeof hash !== 'string') {
        return false;
    }
    
    const txHashRegex = /^0x[a-fA-F0-9]{64}$/;
    return txHashRegex.test(hash);
}

export function isValidDate(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return false;
    }
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date) && date.toISOString().slice(0, 10) === dateStr;
}