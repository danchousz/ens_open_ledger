import { config } from '../../config/cfg.mjs';

export class RateLimiter {
    constructor() {
        this.userRequests = new Map();
    }

    checkRateLimit(userId) {
        const now = Date.now();
        
        if (!this.userRequests.has(userId)) {
            this.userRequests.set(userId, {
                count: 1,
                firstRequest: now
            });
            return { allowed: true, remaining: config.RATE_LIMIT.max - 1 };
        }

        const userData = this.userRequests.get(userId);
        
        if (now - userData.firstRequest > config.RATE_LIMIT.windowMs) {
            userData.count = 1;
            userData.firstRequest = now;
            this.userRequests.set(userId, userData);
            return { allowed: true, remaining: config.RATE_LIMIT.max - 1 };
        }

        if (userData.count >= config.RATE_LIMIT.max) {
            const resetTime = userData.firstRequest + config.RATE_LIMIT.windowMs;
            const waitTime = Math.ceil((resetTime - now) / 1000);
            return { 
                allowed: false, 
                remaining: 0,
                resetIn: waitTime
            };
        }

        userData.count++;
        this.userRequests.set(userId, userData);
        return { 
            allowed: true, 
            remaining: config.RATE_LIMIT.max - userData.count 
        };
    }

    cleanup() {
        const now = Date.now();
        for (const [userId, userData] of this.userRequests.entries()) {
            if (now - userData.firstRequest > config.RATE_LIMIT.windowMs) {
                this.userRequests.delete(userId);
            }
        }
    }
}

export const setupMiddleware = (bot) => {
    const rateLimiter = new RateLimiter();

    setInterval(() => rateLimiter.cleanup(), 300000);

    bot.on('message', (msg) => {
        const userId = msg.from.id;
        const chatId = msg.chat.id;
        
        const rateCheck = rateLimiter.checkRateLimit(userId);
        
        if (!rateCheck.allowed) {
            bot.sendMessage(chatId, 
                `${config.MESSAGES.RATE_LIMIT}\nTry again in ${rateCheck.resetIn} seconds.`
            );
            return;
        }

        console.log(`User ${msg.from.username || userId}: ${msg.text || '[non-text]'} (${rateCheck.remaining} remaining)`);
    });

    bot.on('message', (msg) => {
        if (!msg.text) {
            const messageType = Object.keys(msg).find(key => 
                ['voice', 'photo', 'video', 'document', 'sticker', 'audio'].includes(key)
            );
            
            if (messageType) {
                console.log(`Received ${messageType} from ${msg.from.username || msg.from.id}`);
                bot.sendMessage(msg.chat.id, 'You can send text messages only!');
                return;
            }
        }
    });

    bot.on('polling_error', (error) => {
        console.error('Polling error:', error);
    });

    bot.on('error', (error) => {
        console.error('General bot error:', error);
    });

    return rateLimiter;
};