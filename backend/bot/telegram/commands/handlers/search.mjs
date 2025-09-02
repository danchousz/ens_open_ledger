import { ApiService } from '../services/ApiService.mjs';
import { formatTransaction, prepareDetailedStats, formatDetailedMessage, findAvatar } from '../utils/helpers.mjs';
import { createSearchKeyboard, createFormatKeyboard } from '../utils/keyboards.mjs';
import { isValidEthereumAddress } from '../utils/validators.mjs';
import { config } from '../../config/cfg.mjs';

const apiService = new ApiService(config.API_URL);

export const setupSearchCommands = (bot, stateService) => {
    const searchStates = new Map();

    bot.on('message', async (msg) => {
        if (!msg.text) return;
        
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const searchState = searchStates.get(userId);

        switch (msg.text) {
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
        }

        if (searchState) {
            if (searchState.state === 'awaiting_recipient') {
                await handleRecipientSearch(bot, chatId, userId, msg.text, stateService);
                searchStates.delete(userId);
            } else if (searchState.state === 'awaiting_hash') {
                await handleHashSearch(bot, chatId, msg.text);
                searchStates.delete(userId);
            }
        }

        const match = msg.text.match(/^(.+?) \(0x[a-fA-F0-9]+\.\.\.\)$/);
        if (match) {
            const recipientName = match[1];
            await showEnhancedRecipientDetails(bot, chatId, userId, recipientName, stateService);
        }
    });
};

async function handleRecipientSearch(bot, chatId, userId, searchText, stateService) {
    try {
        const loadingMsg = await bot.sendMessage(chatId, '🔍 Searching...');

        if (searchText.startsWith('0x')) {
            if (!isValidEthereumAddress(searchText)) {
                await bot.editMessageText(
                    'Invalid Ethereum address format.',
                    { chat_id: chatId, message_id: loadingMsg.message_id }
                );
                return;
            }

            const data = await apiService.getRecipientDetails(searchText);
            await bot.deleteMessage(chatId, loadingMsg.message_id);
            
            if (!data.success) {
                await bot.sendMessage(chatId, 'No recipient found with this address.');
                return;
            }

            await showEnhancedRecipientDetails(bot, chatId, userId, data.recipient, stateService);
            return;
        }

        const suggestions = await apiService.searchRecipients(searchText);
        await bot.deleteMessage(chatId, loadingMsg.message_id);

        if (suggestions.length === 0) {
            await bot.sendMessage(chatId, 'No recipients found.');
            return;
        }

        if (suggestions.length === 1) {
            await showEnhancedRecipientDetails(bot, chatId, userId, suggestions[0].name, stateService);
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

async function handleHashSearch(bot, chatId, transactionHash) {
    try {
        const loadingMsg = await bot.sendMessage(chatId, '🔍 Searching transaction...');
        
        const data = await apiService.getTransactionByHash(transactionHash);
        await bot.deleteMessage(chatId, loadingMsg.message_id);

        if (data.data.length === 0) {
            await bot.sendMessage(chatId, 'No transactions found with this hash.');
            return;
        }

        const transactions = data.data
            .map(tx => formatTransaction(tx))
            .join('\n');

        await bot.sendMessage(chatId, `📊 Found transaction:\n\n${transactions}`, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });

    } catch (error) {
        console.error('Error searching transaction:', error);
        await bot.sendMessage(chatId, 'Error searching transaction. Please try again.');
    }
}

async function showEnhancedRecipientDetails(bot, chatId, userId, identifier, stateService) {
    try {
        const loadingMsg = await bot.sendMessage(chatId, 'Loading recipient details...');
        
        const data = await apiService.getRecipientDetails(identifier);
        
        if (!data.success || !data.transactions || data.transactions.length === 0) {
            await bot.editMessageText(
                data.error || 'No transaction data found for this recipient',
                { chat_id: chatId, message_id: loadingMsg.message_id }
            );
            return;
        }
        const detailedStats = await prepareDetailedStats(data.transactions);
        const formattedMessage = await formatDetailedMessage(data.recipient, detailedStats);

        await bot.deleteMessage(chatId, loadingMsg.message_id);

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

        stateService.setState(userId, {
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