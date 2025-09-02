import TelegramBot from 'node-telegram-bot-api';
import { config } from './config/cfg.mjs';
import { registerCommands } from './commands/index.mjs';
import { setupMiddleware } from './commands/handlers/middleware.mjs';
import { initializeTransactionWatcher } from './watcher.mjs';

export const startBot = async () => {
    try {
        const bot = new TelegramBot(config.BOT_TOKEN, { 
            polling: true,
            polling_interval: config.POLLING_INTERVAL
        });

        const rateLimiter = setupMiddleware(bot);

        await registerCommands(bot);

        initializeTransactionWatcher(bot);

        bot.on('message', (msg) => {
            if (msg.text) {
                console.log(`User ${msg.from.username || msg.from.id}: ${msg.text}`);
            }
        });

        console.log('✅ Telegram bot started successfully');
        return bot;

    } catch (error) {
        console.error('❌ Error starting Telegram bot:', error);
        throw error;
    }
};