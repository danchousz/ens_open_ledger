import { createMainKeyboard, createLatestKeyboard, createHistoricalKeyboard, createSearchKeyboard } from '../utils/keyboards.mjs';
import { config } from '../../config/cfg.mjs';

export const setupMenuCommands = (bot, stateService) => {
    
    bot.onText(/\/menu/, async (msg) => {
        const chatId = msg.chat.id;
        const isAdmin = config.ADMIN_IDS.includes(msg.from.id);
        
        await bot.sendMessage(chatId, 'Choose action:', {
            reply_markup: createMainKeyboard(isAdmin)
        });
    });

    bot.on('message', async (msg) => {
        if (!msg.text) return;
        
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        switch (msg.text) {
            case '📊 Latest transactions':
                await bot.sendMessage(chatId, 'Select category for latest transactions:', {
                    reply_markup: createLatestKeyboard()
                });
                break;

            case '📈 Historical data':
                stateService.setState(userId, { menuContext: 'historical' });
                await bot.sendMessage(chatId, 'Select category for historical data:', {
                    reply_markup: createHistoricalKeyboard()
                });
                break;

            case '🔍 Search address':
                await bot.sendMessage(chatId, 'Select search method:', {
                    reply_markup: createSearchKeyboard()
                });
                break;

            case '⬅️ Back to main menu':
                stateService.clearState(userId);
                const welcomeMessage = 'Choose action:';
                await bot.sendMessage(chatId, welcomeMessage, {
                    reply_markup: createMainKeyboard(config.ADMIN_IDS.includes(msg.from.id))
                });
                break;
        }
    });
};