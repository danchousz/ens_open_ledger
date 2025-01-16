import { getData } from "../../utils/dataLoader.mjs";
import { notifySubscribers } from "./commands.mjs"

let lastKnownTransactions = new Set();

export const initializeTransactionWatcher = (bot) => {
    const data = getData();
    lastKnownTransactions = new Set(data.map(tx => tx['Transaction Hash']));

    setInterval(async () => {
        try {
            const currentData = getData(false, true);
            const currentTransactions = new Set(currentData.map(tx => tx['Transaction Hash']));

            const newTransactions = currentData.filter(tx => 
                !lastKnownTransactions.has(tx['Transaction Hash'])
            );

            if (newTransactions.length > 0) {
                console.log(`Found ${newTransactions.length} new transactions`)
                for (const tx of newTransactions) {
                    await notifySubscribers(bot, {
                        hash: tx['Transaction Hash'],
                        date: tx['Date'],
                        from: tx['From'],
                        from_name: tx['From_name'] || tx['From'],
                        to: tx['To'],
                        to_name: tx['To_name'] || tx['To'],
                        amount: tx['Value'],
                        symbol: tx['Symbol'] || '',
                        quarter: tx['Quarter'],
                        dot_usd: tx['DOT_USD'] ? tx['DOT_USD'] : '',
                        category: tx['To_category'] || 'Unknown',
                        Thru: tx['Thru'] || 'Direct'
                    });
                }
                lastKnownTransactions = currentTransactions;
            }

        } catch (error) {
            console.error('Error checking for new transactions:', error);
        }
    }, 60000);
};