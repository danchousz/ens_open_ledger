import TelegramBot from 'node-telegram-bot-api';
import { config } from '../../config/telegram/cfg.mjs';
import { registerCommands, setupSubscriptions } from './commands.mjs';
import { initializeTransactionWatcher } from './watcher.mjs';

export const startBot = () => {
    const bot = new TelegramBot(config.BOT_TOKEN, { 
        polling: true,
        polling_interval: config.POLLING_INTERVAL
    });

    setupSubscriptions(bot);

    initializeTransactionWatcher(bot);

    bot.on('message', (msg) => {
        console.log(`Received message from ${msg.from.username || msg.from.id}: ${msg.text}`);
    });

    bot.on('polling_error', (error) => {
        console.error('Polling error:', error);
    });

    bot.on('error', (error) => {
        console.error('General error:', error);
    });

    const userRequests = new Map();

    bot.on('message', (msg) => {
        const userId = msg.from.id;
        const now = Date.now();
        
        if (!userRequests.has(userId)) {
            userRequests.set(userId, {
                count: 1,
                firstRequest: now
            });
        } else {
            const userData = userRequests.get(userId);
            if (now - userData.firstRequest > config.RATE_LIMIT.windowMs) {
                userData.count = 1;
                userData.firstRequest = now;
            } else if (userData.count >= config.RATE_LIMIT.max) {
                bot.sendMessage(msg.chat.id, config.MESSAGES.RATE_LIMIT);
                return;
            } else {
                userData.count++;
            }
            userRequests.set(userId, userData);
        }
    });

    registerCommands(bot);

    console.log('Telegram bot started');
    return bot;
};