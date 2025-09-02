import { config } from '../../config/cfg.mjs'
import { ApiService } from '../services/ApiService.mjs';

const apiService = new ApiService(config.API_URL);
const markingStates = new Map();

import fs from 'fs/promises';
import path from 'path';

async function handleNameMarking(bot, chatId, userId, walletName, markingState) {
    try {
        const loadingMsg = await bot.sendMessage(chatId, 'Updating ens_wallets.json...');
        
        const walletsPath = path.join(process.cwd(), '..', 'scripts', 'data_miner', 'config', 'ens_wallets.json');
        
        let fileData;
        try {
            const fileContent = await fs.readFile(walletsPath, 'utf8');
            fileData = JSON.parse(fileContent);
        } catch (error) {
            fileData = { wallets: [] };
        }

        if (!fileData.wallets || !Array.isArray(fileData.wallets)) {
            fileData.wallets = [];
        }

        const validWalletName = walletName.trim();
        if (!validWalletName || validWalletName.length > 100) {
            await bot.editMessageText('Invalid wallet name. Must be 1-100 characters.', {
                chat_id: chatId,
                message_id: loadingMsg.message_id
            });
            return;
        }
        
        const address = markingState.address.toLowerCase();
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            await bot.editMessageText('Invalid Ethereum address format.', {
                chat_id: chatId,
                message_id: loadingMsg.message_id
            });
            return;
        }
        
        let wallet = fileData.wallets.find(w => w && w.name === validWalletName);
        
        if (wallet) {
            if (!Array.isArray(wallet.addresses)) {
                wallet.addresses = [];
            }
            
            if (!wallet.addresses.includes(address)) {
                wallet.addresses.push(address);
            } else {
                await bot.editMessageText(`Address ${address.slice(0, 8)}... is already assigned to "${validWalletName}"`, {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id
                });
                return;
            }
        } else {
            fileData.wallets.push({
                name: validWalletName,
                type: "Endpoint",
                addresses: [address]
            });
        }
        
        await fs.writeFile(walletsPath, JSON.stringify(fileData, null, 2), 'utf8');
        
        await bot.editMessageText(
            `Address ${address.slice(0, 8)}... assigned to "${validWalletName}"\n\n` +
            `Wallet now has ${wallet ? wallet.addresses.length : 1} address(es)`,
            {
                chat_id: chatId,
                message_id: loadingMsg.message_id
            }
        );
        
        console.log(`Admin ${userId} assigned address ${address} to wallet "${validWalletName}"`);

    } catch (error) {
        console.error('Error handling name marking:', error);
        await bot.sendMessage(chatId, 'Error updating ens_wallets.json');
    }
}

async function handleCategoryMarking(bot, chatId, userId, categoryName, markingState) {
    try {
        const loadingMsg = await bot.sendMessage(chatId, 'Updating transactions.json...');
        
        const transactionsPath = path.join(process.cwd(), '..', 'scripts', 'data_miner', 'config', 'transactions.json');
        
        let transactionsData;
        try {
            const fileContent = await fs.readFile(transactionsPath, 'utf8');
            transactionsData = JSON.parse(fileContent);
        } catch (error) {
            transactionsData = [];
        }
        
        if (!Array.isArray(transactionsData)) {
            transactionsData = [];
        }
        
        const validCategoryName = categoryName.trim();
        if (!validCategoryName || validCategoryName.length > 100) {
            await bot.editMessageText('Invalid category name. Must be 1-100 characters.', {
                chat_id: chatId,
                message_id: loadingMsg.message_id
            });
            return;
        }
        
        let category = transactionsData.find(cat => cat.category === validCategoryName);
        
        if (category) {
            if (!category.txhashes.includes(markingState.txHash)) {
                category.txhashes.push(markingState.txHash);
            } else {
                await bot.editMessageText(`Transaction ${markingState.txHash.slice(0, 8)}... is already in category "${validCategoryName}"`, {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id
                });
                return;
            }
        } else {
            transactionsData.push({
                category: validCategoryName,
                txhashes: [markingState.txHash]
            });
        }
        
        await fs.writeFile(transactionsPath, JSON.stringify(transactionsData, null, 2), 'utf8');
        
        await bot.editMessageText(
            `Transaction ${markingState.txHash.slice(0, 8)}... marked as "${validCategoryName}"\n\n` +
            `Category now has ${category ? category.txhashes.length : 1} transaction(s)`,
            {
                chat_id: chatId,
                message_id: loadingMsg.message_id
            }
        );
        
        console.log(`Admin ${userId} marked transaction ${markingState.txHash} as category "${validCategoryName}"`);

    } catch (error) {
        console.error('Error handling category marking:', error);
        await bot.sendMessage(chatId, 'Error updating transactions.json');
    }
}

export const setupAdminCommands = (bot, stateService) => {
    
    bot.onText(/\/admin/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        if (!config.ADMIN_IDS.includes(userId)) {
            await bot.sendMessage(chatId, '❌ Access denied. Admin privileges required.');
            return;
        }
        
        const adminKeyboard = createAdminKeyboard();
        
        await bot.sendMessage(chatId, '⚙️ Admin Panel:', {
            reply_markup: adminKeyboard
        });
    });

    bot.onText(/\/reload/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        if (!config.ADMIN_IDS.includes(userId)) {
            await bot.sendMessage(chatId, '❌ Access denied.');
            return;
        }
        
        await reloadData(bot, chatId);
    });

    bot.on('message', async (msg) => {
        if (!msg.text || !config.ADMIN_IDS.includes(msg.from.id)) return;
        
        const chatId = msg.chat.id;
        if (!msg.text || !msg.from) return;
    
        const userId = msg.from.id;
        const markingState = markingStates.get(userId);
        
        if (markingState && config.ADMIN_IDS.includes(userId)) {
            if (markingState.type === 'category') {
                await handleCategoryMarking(bot, chatId, userId, msg.text, markingState);
            } else if (markingState.type === 'name') {
                await handleNameMarking(bot, chatId, userId, msg.text, markingState);
            }
            
            markingStates.delete(userId);
            return;
        }

        switch (msg.text) {
            case '🔄 Reload data':
                await reloadData(bot, chatId);
                break;

            case '📊 Bot stats':
                await showBotStats(bot, chatId);
                break;

            case '👥 Subscriber count':
                await showSubscriberStats(bot, chatId);
                break;

            case '🗑 Clear cache':
                await clearCache(bot, chatId);
                break;

            case '👑 List admins':
                await showAdminList(bot, chatId);
                break;

            case '❓ Unknown contractors':
                await showUnknownContractors(bot, chatId);
                break;

            case '⚙️ Admin panel':
                await bot.sendMessage(chatId, '⚙️ Admin Panel:', {
                    reply_markup: createAdminKeyboard()
                });
                break;
        }
    });

    bot.on('callback_query', async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const userId = callbackQuery.from.id;
        
        if (!config.ADMIN_IDS.includes(userId)) {
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: 'Access denied',
                show_alert: true
            });
            return;
        }

        const data = callbackQuery.data;
        
        if (data.startsWith('mark_cat_')) {
            const shortId = parseInt(data.replace('mark_cat_', ''));
            const txHash = txHashMap.get(shortId);
            
            if (!txHash) {
                await bot.answerCallbackQuery(callbackQuery.id, {
                    text: 'Transaction not found',
                    show_alert: true
                });
                return;
            }

            markingStates.set(userId, {
                type: 'category',
                txHash: txHash,
                messageId: callbackQuery.message.message_id
            });

            await bot.answerCallbackQuery(callbackQuery.id);
            await bot.sendMessage(chatId, 
                `Enter category name for transaction ${txHash.slice(0, 8)}...:\n\n` +
                `Type the category name (e.g., "Websites", "Development", etc.)`,
                {
                    reply_markup: {
                        force_reply: true,
                        input_field_placeholder: "Enter category name..."
                    }
                }
            );

        } else if (data.startsWith('mark_name_')) {
            const shortId = parseInt(data.replace('mark_name_', ''));
            const txHash = txHashMap.get(shortId);
            
            if (!txHash) {
                await bot.answerCallbackQuery(callbackQuery.id, {
                    text: 'Transaction not found',
                    show_alert: true
                });
                return;
            }

            const { getUnknown } = await import('../../../../utils/dataLoader.mjs');
            const unknownData = getUnknown();
            const transaction = unknownData.find(tx => tx['Transaction Hash'] === txHash);
            
            if (!transaction) {
                await bot.answerCallbackQuery(callbackQuery.id, {
                    text: 'Transaction data not found',
                    show_alert: true
                });
                return;
            }

            markingStates.set(userId, {
                type: 'name',
                txHash: txHash,
                address: transaction.To,
                messageId: callbackQuery.message.message_id
            });

            await bot.answerCallbackQuery(callbackQuery.id);
            await bot.sendMessage(chatId, 
                `Enter name for address ${transaction.To}:\n\n` +
                `Type the name (e.g., "serenae.eth", "development-wallet", etc.)`,
                {
                    reply_markup: {
                        force_reply: true,
                        input_field_placeholder: "Enter wallet name..."
                    }
                }
            );
        }
    });

};

async function reloadData(bot, chatId) {
    try {
        const reloadMsg = await bot.sendMessage(chatId, '🔄 Reloading data...');
        
        await bot.editMessageText('✅ Data reloaded successfully!', {
            chat_id: chatId,
            message_id: reloadMsg.message_id
        });
        
        console.log(`Admin ${chatId} reloaded data`);
    } catch (error) {
        console.error('Error reloading data:', error);
        await bot.sendMessage(chatId, '❌ Error reloading data');
    }
}

async function showBotStats(bot, chatId) {
    try {
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();
        
        const stats = `📊 *Bot Statistics*

⏱ *Uptime:* ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m
💾 *Memory Usage:* ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB
🔧 *Node Version:* ${process.version}
📅 *Started:* ${new Date(Date.now() - uptime * 1000).toLocaleString()}`;

        await bot.sendMessage(chatId, stats, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error showing bot stats:', error);
        await bot.sendMessage(chatId, '❌ Error fetching stats');
    }
}

async function showSubscriberStats(bot, chatId) {
    try {
        const { subscriberStorage } = await import('../../storage.mjs');
        
        const subscribers = subscriberStorage.getAllSubscribers();
        const stats = `👥 *Subscriber Statistics*

📊 *Total Subscribers:* ${subscribers.length}
📅 *Active Subscriptions:* ${subscribers.length}`;

        await bot.sendMessage(chatId, stats, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error showing subscriber stats:', error);
        await bot.sendMessage(chatId, '❌ Error fetching subscriber stats');
    }
}

async function clearCache(bot, chatId) {
    try {
        const clearMsg = await bot.sendMessage(chatId, '🗑 Clearing cache...');
        
        await bot.editMessageText('✅ Cache cleared successfully!', {
            chat_id: chatId,
            message_id: clearMsg.message_id
        });
        
        console.log(`Admin ${chatId} cleared cache`);
    } catch (error) {
        console.error('Error clearing cache:', error);
        await bot.sendMessage(chatId, '❌ Error clearing cache');
    }
}

function createAdminKeyboard() {
    return {
        keyboard: [
            [{ text: '🔄 Reload data' }, { text: '📊 Bot stats' }],
            [{ text: '👥 Subscriber count' }, { text: '🗑 Clear cache' }],
            [{ text: '👑 List admins' }, { text: '❓ Unknown contractors' }],
            [{ text: '⬅️ Back to main menu' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    };
}

async function showAdminList(bot, chatId) {
    try {
        const adminIds = config.ADMIN_IDS;
        
        if (adminIds.length === 0) {
            await bot.sendMessage(chatId, '👑 *Admin List*\n\nNo admins configured.', 
                { parse_mode: 'Markdown' });
            return;
        }

        let adminList = '👑 *Admin List*\n\n';
        adminIds.forEach((adminId, index) => {
            adminList += `${index + 1}. ID: \`${adminId}\`\n`;
        });
        
        adminList += `\nTotal: ${adminIds.length} admin(s)`;

        await bot.sendMessage(chatId, adminList, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error showing admin list:', error);
        await bot.sendMessage(chatId, '❌ Error fetching admin list');
    }
}

async function showUnknownContractors(bot, chatId) {
    try {
        const { getUnknown } = await import('../../../../utils/dataLoader.mjs');
        const unknownData = getUnknown();
        
        if (!unknownData || unknownData.length === 0) {
            await bot.sendMessage(chatId, 'Unknown contractors not found.');
            return;
        }

        await bot.sendMessage(chatId, `${unknownData.length} txs found.`);

        for (const tx of unknownData) {
            await sendUnknownTransactionMessage(bot, chatId, tx);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

    } catch (error) {
        console.error('Error showing unknown contractors:', error);
        await bot.sendMessage(chatId, 'Error finding the contractors.');
    }
}

const txHashMap = new Map();
let txCounter = 0;

async function sendUnknownTransactionMessage(bot, chatId, tx) {
    const toName = tx.To_name || tx.To;
    const toCategory = tx.To_category || '';
    const isAddressName = /^0x[a-fA-F0-9]{40}$/.test(toName);
    
    const shortId = txCounter++;
    txHashMap.set(shortId, tx['Transaction Hash']);
    
    let unknownType;
    let buttons = [];
    
    if (toName === toCategory) {
        if (isAddressName) {
            unknownType = "Not Known: Both";
            buttons = [
                [{ text: "Mark Category", callback_data: `mark_cat_${shortId}` }],
                [{ text: "Mark Name", callback_data: `mark_name_${shortId}` }]
            ];
        } else {
            unknownType = "Not Known: Category";
            buttons = [
                [{ text: "Mark Category", callback_data: `mark_cat_${shortId}` }]
            ];
        }
    } else {
        if (isAddressName) {
            unknownType = "Not Known: Name";
            buttons = [
                [{ text: "Mark Name", callback_data: `mark_name_${shortId}` }]
            ];
        } else {
            unknownType = "Not Known: Category";
            buttons = [
                [{ text: "Mark Category", callback_data: `mark_cat_${shortId}` }]
            ];
        }
    }

    const amount = tx.Value ? parseFloat(tx.Value).toFixed(3) : 'N/A';
    const usdValue = tx.DOT_USD ? `($${Math.round(parseFloat(tx.DOT_USD))})` : '';
    const symbol = tx.Symbol || '';
    
    const message = `${unknownType}

Date: ${tx.Date}
From: ${tx.From_name || tx.From}
To: ${toName}
Amound: ${-amount} ${symbol} ${-usdValue}
Category: ${toCategory}
Throught: ${tx.Thru || 'Direct'}

Hash: \`${tx['Transaction Hash']}\``;

    try {
        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: buttons
            }
        });
    } catch (error) {
        console.error('Error sending transaction message:', error);
        await bot.sendMessage(chatId, message, {
            reply_markup: {
                inline_keyboard: buttons
            }
        });
    }
}