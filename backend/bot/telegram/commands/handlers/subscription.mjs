import { subscriberStorage } from '../../storage.mjs';
import { formatTransaction } from '../utils/helpers.mjs';

export const setupSubscriptionCommands = (bot, stateService) => {
    
    bot.onText(/\/subscribe/, async (msg) => {
        const chatId = msg.chat.id;
        await handleSubscribe(bot, chatId);
    });

    bot.onText(/\/unsubscribe/, async (msg) => {
        const chatId = msg.chat.id;
        await handleUnsubscribe(bot, chatId);
    });

    bot.on('message', async (msg) => {
        if (!msg.text) return;
        
        const chatId = msg.chat.id;

        switch (msg.text) {
            case '🔔 Subscribe to updates':
                await handleSubscribe(bot, chatId);
                break;

            case '🔕 Unsubscribe':
                await handleUnsubscribe(bot, chatId);
                break;
        }
    });
};

async function handleSubscribe(bot, chatId) {
    try {
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
    } catch (error) {
        console.error('Error in handleSubscribe:', error);
        await bot.sendMessage(chatId, '❌ Error subscribing to updates. Please try again.');
    }
}

async function handleUnsubscribe(bot, chatId) {
    try {
        if (!subscriberStorage.isSubscribed(chatId)) {
            await bot.sendMessage(chatId, 'You are not subscribed to updates!');
            return;
        }
        
        subscriberStorage.removeSubscriber(chatId);
        await bot.sendMessage(chatId, '✅ Successfully unsubscribed from transaction updates.');
        console.log(`User ${chatId} unsubscribed from updates`);
    } catch (error) {
        console.error('Error in handleUnsubscribe:', error);
        await bot.sendMessage(chatId, '❌ Error unsubscribing. Please try again.');
    }
}

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
            await bot.sendMessage(chatId, `🔔 New transaction detected:\n${message}`, {
                parse_mode: 'Markdown', 
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