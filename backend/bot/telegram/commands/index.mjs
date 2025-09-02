import { setupMenuCommands } from './handlers/menu.mjs';
import { setupLatestCommands } from './handlers/latest.mjs';
import { setupHistoricalCommands } from './handlers/historical.mjs';
import { setupSearchCommands } from './handlers/search.mjs';
import { setupExportCommands } from './handlers/export.mjs';
import { setupSubscriptionCommands } from './handlers/subscription.mjs';
import { setupAdminCommands } from './handlers/admin.mjs';
import { StateService } from './services/StateService.mjs';
import { createMainKeyboard } from './utils/keyboards.mjs';
import { config } from '../config/cfg.mjs';

export const registerCommands = async (bot) => {
    const stateService = new StateService();
    
    setupMenuCommands(bot, stateService);
    setupLatestCommands(bot, stateService);
    setupHistoricalCommands(bot, stateService);
    setupSearchCommands(bot, stateService);
    setupExportCommands(bot, stateService);
    setupSubscriptionCommands(bot, stateService);
    setupAdminCommands(bot, stateService);

    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const isAdmin = config.ADMIN_IDS.includes(msg.from.id);
        bot.sendMessage(chatId, config.MESSAGES.START, {
            reply_markup: createMainKeyboard(isAdmin),
            parse_mode: config.PARSEMODE,
            disable_web_page_preview: true
        });
    });

    console.log('All bot commands registered');
};