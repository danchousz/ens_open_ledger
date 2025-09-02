import { ApiService } from '../services/ApiService.mjs';
import { formatTransaction } from '../utils/helpers.mjs';
import { config } from '../../config/cfg.mjs';
import { filterTransactions } from '../utils/helpers.mjs';

const apiService = new ApiService(config.API_URL);

export const setupLatestCommands = (bot, stateService) => {
    
    bot.onText(/\/latest/, async (msg) => {
        const chatId = msg.chat.id;
        await showTransactions(bot, chatId);
    });

    bot.on('message', async (msg) => {
        if (!msg.text) return;
        
        const chatId = msg.chat.id;

        if (msg.text.startsWith('Latest: ')) {
            const category = msg.text.replace('Latest: ', '');
            await showTransactions(bot, chatId, category);
        }
    });
};

async function showTransactions(bot, chatId, category = null) {
    try {
        const loadingMsg = await bot.sendMessage(chatId, '⏳ Loading transactions...');
        
        const data = await apiService.getTransactions();
        
        await bot.deleteMessage(chatId, loadingMsg.message_id);
        
        if (data.data.length === 0) {
            await bot.sendMessage(chatId, config.MESSAGES.NO_DATA);
            return;
        }

        let filteredTransactions = category === 'Whole DAO' || !category
            ? data.data
            : data.data.filter(tx => tx.from_name === category);

        filteredTransactions = filterTransactions(filteredTransactions, false);

        if (filteredTransactions.length === 0) {
            await bot.sendMessage(chatId, `No transactions found for ${category}`);
            return;
        }

        const transactions = filteredTransactions
            .slice(0, config.MAX_TRANSACTIONS_PER_MESSAGE)
            .reverse()
            .map(tx => formatTransaction(tx))
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