import { config } from '../../config/telegram/cfg.mjs';
import fetch from 'node-fetch';
import { createMainKeyboard, createLatestKeyboard, createHistoricalKeyboard, createPeriodKeyboard, createQuartersKeyboard, createYearsKeyboard, createDateSelectionKeyboard, createFormatKeyboard, createSearchKeyboard } from './modules/keyboards.mjs';
import fs from 'fs';
import { subscriberStorage } from './storage.mjs';
import path from 'path';
import _ from 'lodash';

const DEFAULT_COMMANDS = [
    { command: 'menu', description: 'Open bot menu' },
    { command: 'subscribe', description: 'Get updates' },
    { command: 'unsubscribe', description: 'Stop updates' }
];

const ADMIN_COMMANDS = [
    { command: 'admin', description: 'Show admin commands' },
    { command: 'reload', description: 'Reload data' }
];

const userSelections = new Map();

const handleApiError = async (response) => {
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error: ${response.status} ${text}`);
    }
    return response.json();
};

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

const formatTransaction = (tx) => {
    const directMessage = tx.Thru === 'Direct' ? 'directly ' : '';
    const indirectMessage = tx.Thru !== 'Direct' ? ` via ${tx.Thru}` : '';

    const formattedAmount = tx.symbol === 'USDC'
                        ? Math.round(tx.amount)
                        : Math.round(tx.amount, 3);

    const dotusdMessage = tx.symbol === 'USDC'
                        ? ''
                        : `($${Math.round(tx.dot_usd, 0)}) `
    const categoryMessage = tx.category === tx.to_name 
                        ? ''
                        : `within the category ${tx.category}`;
    const etherscanLink = `[View on Etherscan](https://etherscan.io/tx/${tx.hash})`
    const ledgerLink = tx.to_name !== 'DAO Wallet'
                    ? `[${tx.to_name}](https://ens-ledger.app/?details=${tx.to_name})`
                    : tx.to_name;

    return `\n*${tx.date}*: ${tx.from_name} ${directMessage}sent ${formattedAmount} ${tx.symbol} ${dotusdMessage}to ${ledgerLink} ${categoryMessage}${indirectMessage}\n${etherscanLink}\n`;
};

async function showTransactions(bot, chatId, category = null) {
    try {
        const response = await fetch(`${config.API_URL}/api/telegram/transactions`);
        const data = await handleApiError(response);
        
        if (data.data.length === 0) {
            await bot.sendMessage(chatId, config.MESSAGES.NO_DATA);
            return;
        }
        let filteredTransactions = category === 'Whole DAO' || !category
            ? data.data
            : data.data.filter(tx => tx.from_name === category);

        if (filteredTransactions.length === 0) {
            await bot.sendMessage(chatId, `No transactions found for ${category}`);
            return;
        }

        const transactions = filteredTransactions
            .slice(0, config.MAX_TRANSACTIONS_PER_MESSAGE)
            .reverse()
            .map(formatTransaction)
            .join('\n');

        const headerText = category 
            ? `📊 ${category} transactions:\n\n`
            : '📊 All transactions:\n';

        await bot.sendMessage(chatId, `${headerText}${transactions}`, {
            parse_mode: config.PARSEMODE,
            disable_web_page_preview: true
        });
    } catch (error) {
        console.error('Error in showTransactions:', error);
        await bot.sendMessage(chatId, config.MESSAGES.ERROR);
    }
}

export const setupBotCommands = async (bot) => {
    const setCommandsForUser = async (chatId) => {
        try {
            const isAdmin = config.ADMIN_IDS.includes(chatId);
            const commands = isAdmin ? [...DEFAULT_COMMANDS, ...ADMIN_COMMANDS] : DEFAULT_COMMANDS;
            
            await bot.setMyCommands(commands);
            console.log(`Commands menu set up successfully for chat ${chatId}`);
        } catch (error) {
            console.error('Error setting up commands menu:', error);
        }
    };

    try {
        await bot.setMyCommands(DEFAULT_COMMANDS);
        console.log('Default commands menu set up successfully');
    } catch (error) {
        console.error('Error setting up default commands menu:', error);
    }

    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        await setCommandsForUser(chatId);
    });
};

async function handleRecipientSearch(bot, chatId, searchText) {
    try {
        if (searchText.startsWith('0x')) {
            if (searchText.length !== 42 && searchText.length > 20) {
                await bot.sendMessage(
                    chatId,
                    'Invalid address length. Ethereum address should be 42 characters (including 0x).'
                );
                return;
            }
            const response = await fetch(`${config.API_URL}/api/telegram/recipient/details/${searchText}`);
            const data = await handleApiError(response);
            
            if (!data.success) {
                await bot.sendMessage(chatId, 'No recipient found with this address.');
                return;
            }

            await showEnhancedRecipientDetails(bot, chatId, data.recipient);
            return;
        }
        const searchResponse = await fetch(
            `${config.API_URL}/api/telegram/search?term=${encodeURIComponent(searchText)}`
        );
        const suggestions = await handleApiError(searchResponse);

        if (suggestions.length === 0) {
            await bot.sendMessage(chatId, 'No recipients found.');
            return;
        }

        if (suggestions.length === 1) {

            await showEnhancedRecipientDetails(bot, chatId, suggestions[0].name);
        } else {

            const keyboard = suggestions.map(s => [{
                text: `${s.name} (${s.address ? s.address.slice(0, 6) + '...' : 'No address'})`
            }]);
            keyboard.push([{ text: '⬅️ Back to search menu' }]);

            await bot.sendMessage(
                chatId,
                'Several recipients found. Please select one:',
                {
                    reply_markup: {
                        keyboard,
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                }
            );
        }
    } catch (error) {
        console.error('Error in recipient search:', error);
        await bot.sendMessage(chatId, 'Error searching recipient. Please try again.');
    }
}

async function prepareDetailedStats(transactions) {

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
    const totalValue = _.sumBy(transactions, tx => safeNumber(tx.DOT_USD))

    return {
        assetSummary,
        firstTransaction,
        lastTransaction,
        workingGroupStats,
        categoryStats,
        totalUSDValue: totalValue,
        transactionCount: transactions.length
    };
}

async function formatDetailedMessage(recipientName, stats) {
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

    const message = `🔍 *${recipientName}*

💰 *Total Value Received:* ${formatCurrency(stats.totalUSDValue)}`;


    const assetsSection = assetLines ? `\n\n📦 *Assets Breakdown:*${assetLines}` : '';


    const activitySection = `\n\n📅 *Activity Period:*
• First Transaction: ${formatDate(stats.firstTransaction)}
• Last Transaction: ${formatDate(stats.lastTransaction)}
• Total Transactions: ${stats.transactionCount}`;


    const workingGroupsSection = workingGroupLines ? `\n\n👥 *Source Working Groups:*\n${workingGroupLines}` : '';


    const categoriesSection = categoryLines ? `\n\n📑 *Category Distribution:*\n${categoryLines}` : '';

    const ledgerLink = `\n\n[ENS Ledger](https://ens-ledger.app/?details=${recipientName})`;

    return message + assetsSection + activitySection + workingGroupsSection + categoriesSection + ledgerLink;
}


async function findAvatar(recipientName) {
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
}

async function showEnhancedRecipientDetails(bot, chatId, identifier) {
    try {
        const response = await fetch(
            `${config.API_URL}/api/telegram/recipient/details/${encodeURIComponent(identifier)}`
        );
        const data = await handleApiError(response);

        if (!data.success || !data.transactions || data.transactions.length === 0) {
            await bot.sendMessage(chatId, data.error || 'No transaction data found for this recipient');
            return;
        }

        const detailedStats = await prepareDetailedStats(data.transactions);
        const formattedMessage = await formatDetailedMessage(data.recipient, detailedStats);

        const avatarPath = await findAvatar(data.recipient);
        
        try {
            if (avatarPath) {
                await bot.sendPhoto(chatId, avatarPath, {
                    caption: formattedMessage,
                    parse_mode: 'Markdown'
                });
            } else {
                await bot.sendMessage(chatId, formattedMessage, {
                    parse_mode: 'Markdown'
                });
            }
        } catch (error) {
            console.error('Error sending message with avatar:', error);
            await bot.sendMessage(chatId, formattedMessage, {
                parse_mode: 'Markdown'
            });
        }


        userSelections.set(chatId, {
            type: 'recipient_data',
            menuContext: 'recipient_search', 
            recipient: identifier,
            recipientName: data.recipient,
            transactionCount: detailedStats.transactionCount,
            totalReceived: detailedStats.totalUSDValue,
            category: data.recipient,
            period: 'All time'
        });

        await bot.sendMessage(chatId, 'Choose export format:', {
            reply_markup: createFormatKeyboard()
        });

    } catch (error) {
        console.error('Error showing recipient details:', error);
        await bot.sendMessage(chatId, 'Error getting recipient details. Please try again.');
    }
}

function isValidDate(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return false;
    }
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date) && date.toISOString().slice(0, 10) === dateStr;
}


export const setupCustomMenu = (bot) => {
    const dateInputStates = new Map();
    const searchStates = new Map();

    async function getAvailableQuarters(category) {
        try {
            const response = await fetch(`${config.API_URL}/api/telegram/quarters/${category}`);
            const data = await handleApiError(response);
            return data.quarters;
        } catch (error) {
            console.error('Error fetching quarters:', error);
            return [];
        }
    }

    async function getAvailableYears(category) {
        try {
            const response = await fetch(`${config.API_URL}/api/telegram/years/${category}`);
            const data = await handleApiError(response);
            return data.years;
        } catch (error) {
            console.error('Error fetching years:', error);
            return [];
        }
    }

    bot.onText(/\/menu/, async (msg) => {
        const chatId = msg.chat.id;
        const isAdmin = config.ADMIN_IDS.includes(msg.from.id);
        
        await bot.sendMessage(chatId, 'Choose action:', {
            reply_markup: createMainKeyboard(isAdmin)
        });
    });

    async function exportData(bot, chatId, category, period, format) {
        try {
            let periodParam;
            if (period === 'All time') {
                periodParam = 'all';
            } else if (period.includes('Q')) {
                const [quarter, year] = period.split(' ');
                periodParam = `${year}${quarter}`;
            } else if (period.includes(':')) {
                const [startDate, endDate] = period.split(':');
                periodParam = `${startDate}_to_${endDate}`;
            } else {
                periodParam = period;
            }
    
            const filename = `${category}_${periodParam}.${format}`;
            const url = `${config.API_URL}/api/telegram/export/${category}/${periodParam}/${format}`;
            
            console.log('Requesting URL:', url);
    
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const tempFile = `/tmp/${filename}`;
            const data = await response.arrayBuffer();
            await fs.promises.writeFile(tempFile, Buffer.from(data));
    
            await bot.sendDocument(chatId, tempFile, {
                caption: `Historical data for ${category} (${period})`
            });
    
            await fs.promises.unlink(tempFile);
    
            await bot.sendMessage(chatId, 'Choose action:', {
                reply_markup: createMainKeyboard()
            });
    
        } catch (error) {
            console.error('Error exporting data:', error);
            await bot.sendMessage(chatId, 'Error exporting data. Please try again.');
        }
    }

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const userSelection = userSelections.get(userId) || {};
        const dateState = dateInputStates.get(userId);
        const searchState = searchStates.get(userId);

        if (!msg.text) {
            console.log(`Received non-text message type: ${Object.keys(msg).filter(key => 
                ['voice', 'photo', 'video', 'document', 'sticker'].includes(key))}`);
            bot.sendMessage(chatId, `You can send text messages only!`)
            return;
        }

        switch (msg.text) {
            case '📊 Latest transactions':
                await bot.sendMessage(chatId, 'Select category for latest transactions:', {
                    reply_markup: createLatestKeyboard()
                });
                break;

            case '⬅️ Back to categories':
                searchStates.delete(userId);
                await bot.sendMessage(chatId, 'Select search type:', {
                    reply_markup: createHistoricalKeyboard()
                });
                break;

            case '📈 Historical data':
                userSelections.set(userId, { menuContext: 'historical' });
                searchStates.delete(userId);
                await bot.sendMessage(chatId, 'Select category for historical data:', {
                    reply_markup: createHistoricalKeyboard()
                });
                break;

            case 'Latest: Whole DAO':
            case 'Latest: Ecosystem':
            case 'Latest: Public Goods':
            case 'Latest: Metagov':
                const category = msg.text.replace('Latest: ', '');
                await showTransactions(bot, chatId, category);
                break;

            case '⬅️ Back to main menu':
                const welcomeMessage = 'Choose action:';
                await bot.sendMessage(chatId, welcomeMessage, {
                    reply_markup: createMainKeyboard(config.ADMIN_IDS.includes(msg.from.id))
                });
                break;

            case '🔍 Search address':
                await bot.sendMessage(chatId, 'Select search method:', {
                    reply_markup: createSearchKeyboard()
                });
                break;

            case '📆 Custom date range':
                dateInputStates.set(userId, {
                    state: 'awaiting_start_date',
                    category: userSelection.category
                });
                await bot.sendMessage(
                    chatId,
                    'Please enter the start date in YYYY-MM-DD format (e.g., 2023-01-01)\n\n' +
                    'Or click ⬅️ Back to period selection to return to the menu',
                    {
                        reply_markup: {
                            keyboard: [[{ text: '⬅️ Back to period selection' }]],
                            resize_keyboard: true
                        }
                    }
                );
                break;

            case '⬅️ Back to period selection':
                dateInputStates.delete(userId);
                await bot.sendMessage(chatId, 'Select period:', {
                    reply_markup: createPeriodKeyboard()
                });
                break;

            case 'Historical: Whole DAO':
            case 'Historical: Ecosystem':
            case 'Historical: Public Goods':
            case 'Historical: Metagov':
            case 'Historical: DAO Wallet':
            case 'Historical: Community WG':
                const historicalCategory = msg.text.replace('Historical: ', '');
                const existingSelection = userSelections.get(userId) || {};
                userSelections.set(userId, {
                    ...existingSelection,
                    category: historicalCategory,
                    menuContext: 'historical',
                    type: 'historical_data'
                });
                await bot.sendMessage(chatId, 'Select period:', {
                    reply_markup: createPeriodKeyboard()
                });
                break;

            case '👤 Search by Recipient':
                searchStates.set(userId, { state: 'awaiting_recipient' });
                await bot.sendMessage(
                    chatId,
                    'Please enter 0x address or recipient name:',
                    {
                        reply_markup: {
                            keyboard: [[{ text: '⬅️ Back to search menu' }]],
                            resize_keyboard: true
                        }
                    }
                );
                break;

            case '📑 XLSX':
            case '📄 CSV':
            case '🔤 JSON':
                try {
                    const userData = userSelections.get(chatId);
                    if (!userData?.category) {
                        await bot.sendMessage(chatId, 'Please select category and period first');
                        return;
                    }

                    const format = msg.text.includes('XLSX') ? 'xlsx' : 
                                msg.text.includes('CSV') ? 'csv' : 'json';
                    await bot.sendMessage(chatId, 'Preparing your file...');

                    if (userData.type === 'recipient_data') {
                        const url = `${config.API_URL}/api/telegram/recipient/export/${encodeURIComponent(userData.recipient)}/${format}`;
                        const response = await fetch(url);
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                        const tempFile = `/tmp/${userData.recipientName}_transactions.${format}`;
                        const data = await response.arrayBuffer();
                        await fs.promises.writeFile(tempFile, Buffer.from(data));
                        await bot.sendDocument(chatId, tempFile, {
                            caption: `Transaction history for ${userData.recipientName}`
                        });
                        await fs.promises.unlink(tempFile);

                        await bot.sendMessage(chatId, 'Select search type:', {
                            reply_markup: createSearchKeyboard()
                        });
                    } else {
                        if (!userData.period) {
                            await bot.sendMessage(chatId, 'Please select period first');
                            return;
                        }
                        await exportData(bot, chatId, userData.category, userData.period, format);
                    }
                } catch (error) {
                    console.error('Error exporting data:', error);
                    await bot.sendMessage(chatId, 'Error exporting data. Please try again.');
                }
                break;
            case '🔍 Search by Transaction Hash':
                searchStates.set(userId, { state: 'awaiting_hash' });
                await bot.sendMessage(
                    chatId,
                    'Please enter the Transaction Hash to search for:',
                    {
                        reply_markup: {
                            keyboard: [[{ text: '⬅️ Back to search menu' }]],
                            resize_keyboard: true
                        }
                    }
                );
                break;

            case '⬅️ Back to search menu':
                    searchStates.delete(userId);
                    await bot.sendMessage(chatId, 'Select search type:', {
                        reply_markup: createSearchKeyboard()
                    });
                    break;

            case '📊 Specific quarter':
                const quarters = await getAvailableQuarters(userSelection.category);
                if (quarters.length === 0) {
                    await bot.sendMessage(chatId, 'No data available for this category');
                    return;
                }
                await bot.sendMessage(chatId, 'Select quarter:', {
                    reply_markup: createQuartersKeyboard(quarters)
                });
                break;

            case '📅 Specific year':
                const years = await getAvailableYears(userSelection.category);
                if (years.length === 0) {
                    await bot.sendMessage(chatId, 'No data available for this category');
                    return;
                }
                await bot.sendMessage(chatId, 'Select year:', {
                    reply_markup: createYearsKeyboard(years)
                });
                break;

            case '📈 All time':
                userSelection.period = 'All time';
                userSelections.set(userId, userSelection);
                await bot.sendMessage(chatId, 'Select format:', {
                    reply_markup: createFormatKeyboard(true)
                });
                break;

            default:
                if (searchState?.state === 'awaiting_hash') {
                    try {
                        const response = await fetch(`${config.API_URL}/api/telegram/transaction/${msg.text}`);
                        const data = await handleApiError(response);

                        if (data.data.length === 0) {
                            await bot.sendMessage(chatId, 'No transactions found with this hash.');
                            return;
                        }

                        const transactions = data.data
                            .map(formatTransaction)
                            .join('\n');

                        await bot.sendMessage(chatId, `📊 Found transaction:\n\n${transactions}`, {
                            parse_mode: config.PARSEMODE,
                            disable_web_page_preview: true
                        });

                        searchStates.delete(userId);

                    } catch (error) {
                        console.error('Error searching transaction:', error);
                        await bot.sendMessage(chatId, 'Error searching transaction. Please try again.');
                    }
                } 
                if (searchState?.state === 'awaiting_recipient') {
                    await handleRecipientSearch(bot, chatId, msg.text);
                    return;
                } else if (msg.text && msg.text.includes('(0x')) {
                    const name = msg.text.split(' (')[0];
                    await showEnhancedRecipientDetails(bot, chatId, name);
                }
                const match = msg.text.match(/^(.+?) \(0x[a-fA-F0-9]+\.\.\.\)$/);
                if (match) {
                    const recipientName = match[1];
                    await showEnhancedRecipientDetails(bot, chatId, recipientName);
                    return;
                }
                if (dateState) {
                    if (dateState.state === 'awaiting_start_date') {
                        if (!isValidDate(msg.text)) {
                            await bot.sendMessage(
                                chatId,
                                'Invalid date format. Please enter the date in YYYY-MM-DD format (e.g., 2023-01-01)'
                            );
                            return;
                        }

                        dateState.startDate = msg.text;
                        dateState.state = 'awaiting_end_date';
                        dateInputStates.set(userId, dateState);

                        await bot.sendMessage(
                            chatId,
                            'Please enter the end date in YYYY-MM-DD format (e.g., 2023-12-31)'
                        );

                    } else if (dateState.state === 'awaiting_end_date') {
                        if (!isValidDate(msg.text)) {
                            await bot.sendMessage(
                                chatId,
                                'Invalid date format. Please enter the date in YYYY-MM-DD format (e.g., 2023-12-31)'
                            );
                            return;
                        }

                        const endDate = new Date(msg.text);
                        const startDate = new Date(dateState.startDate);

                        if (endDate < startDate) {
                            await bot.sendMessage(
                                chatId,
                                'End date cannot be earlier than start date. Please enter a valid end date.'
                            );
                            return;
                        }

                        userSelection.period = `${dateState.startDate}:${msg.text}`;
                        userSelections.set(userId, userSelection);
                        dateInputStates.delete(userId);

                        await bot.sendMessage(chatId, 'Select format:', {
                            reply_markup: createFormatKeyboard(true)
                        });
                    }
                    return;
                }

                if (msg.text.match(/^Q[1-4] \d{4}$/)) {
                    userSelection.period = msg.text;
                    userSelections.set(userId, userSelection);
                    await bot.sendMessage(chatId, 'Select format:', {
                        reply_markup: createFormatKeyboard(true)
                    });
                } else if (msg.text.match(/^\d{4}$/)) {
                    userSelection.period = msg.text;
                    userSelections.set(userId, userSelection);
                    await bot.sendMessage(chatId, 'Select format:', {
                        reply_markup: createFormatKeyboard(true)
                    });
                }
            break;
        }
    });
};

export const registerCommands = (bot) => {
    setupBotCommands(bot);
    setupCustomMenu(bot);
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const isAdmin = config.ADMIN_IDS.includes(msg.from.id);
        bot.sendMessage(chatId, config.MESSAGES.START, {
            reply_markup: createMainKeyboard(isAdmin),
            parse_mode: config.PARSEMODE,
            disable_web_page_preview: true
        });
    });

    bot.onText(/\/latest/, async (msg) => {
        const chatId = msg.chat.id;
        try {
            const response = await fetch(`${config.API_URL}/api/telegram/transactions`);
            const data = await handleApiError(response);
            
            if (data.data.length === 0) {
                bot.sendMessage(chatId, config.MESSAGES.NO_DATA);
                return;
            }
    
            const transactions = data.data
                .slice(0, config.MAX_TRANSACTIONS_PER_MESSAGE)
                .reverse()
                .map(formatTransaction)
                .join('\n')
                .filterTransactions(data, false);
    
            await bot.sendMessage(chatId, `📊\n${transactions}`, {
                parse_mode: config.PARSEMODE,
                disable_web_page_preview: true
            });
        } catch (error) {
            console.error('Error in /latest:', error);
            bot.sendMessage(chatId, config.MESSAGES.ERROR);
        }
    });

};

export const setupSubscriptions = (bot) => {
    bot.onText(/\/subscribe/, async (msg) => {
        const chatId = msg.chat.id;
        if (subscriberStorage.isSubscribed(chatId)) {
            await bot.sendMessage(chatId, 'You are already subscribed to transaction updates!');
            return;
        }
        
        subscriberStorage.addSubscriber(chatId);
        await bot.sendMessage(
            chatId, 
            '✅ Successfully subscribed to transaction updates!\n\n' +
            'You will receive notifications about new transactions as they appear.\n' +
            'Use /unsubscribe to stop receiving updates.'
        );
        console.log(`User ${chatId} subscribed to updates`);
    });

    bot.onText(/\/unsubscribe/, async (msg) => {
        const chatId = msg.chat.id;
        if (!subscriberStorage.isSubscribed(chatId)) {
            await bot.sendMessage(chatId, 'You are not subscribed to updates!');
            return;
        }
        
        subscriberStorage.removeSubscriber(chatId);
        await bot.sendMessage(chatId, '✅ Successfully unsubscribed from transaction updates.');
        console.log(`User ${chatId} unsubscribed from updates`);
    });

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        
        switch (msg.text) {
            case '🔔 Subscribe to updates':
                if (subscriberStorage.isSubscribed(chatId)) {
                    await bot.sendMessage(chatId, 'You are already subscribed to updates!');
                    return;
                }
                subscriberStorage.addSubscriber(chatId);
                await bot.sendMessage(chatId, '✅ Successfully subscribed to transaction updates!');
                break;

            case '🔕 Unsubscribe':
                if (!subscriberStorage.isSubscribed(chatId)) {
                    await bot.sendMessage(chatId, 'You are not subscribed to updates!');
                    return;
                }
                subscriberStorage.removeSubscriber(chatId);
                await bot.sendMessage(chatId, '✅ Successfully unsubscribed from updates.');
                break;
        }
    });
};

export const notifySubscribers = async (bot, newTransaction) => {
    const subscribers = subscriberStorage.getAllSubscribers();
    
    if (subscribers.length === 0) {
        console.log('No subscribers to notify');
        return;
    }

    const message = formatTransaction(newTransaction);
    console.log(`Notifying ${subscribers.length} subscribers about new transaction`);

    for (const chatId of subscribers) {
        try {
            await bot.sendMessage(chatId, `🔔 New transaction detected:\n\n${message}`, {
                parse_mode: config.PARSEMODE, 
                disable_web_page_preview: true
            });
            subscriberStorage.updateLastNotified(chatId);
            console.log(`Notification sent to user ${chatId}`);
        } catch (error) {
            console.error(`Error sending notification to ${chatId}:`, error);
            if (error.response?.statusCode === 403) {
                subscriberStorage.removeSubscriber(chatId);
                console.log(`Removed user ${chatId} from subscribers due to block`);
            }
        }
    }
};