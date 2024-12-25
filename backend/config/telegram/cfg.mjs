import { BOT_TOKEN } from "./telegram-key.mjs";

export const config = {
    BOT_TOKEN: BOT_TOKEN,
    API_URL: 'http://localhost:3000',
    
    POLLING_INTERVAL: 300,
    MAX_TRANSACTIONS_PER_MESSAGE: 10,
    PARSEMODE: 'Markdown',
    
    MESSAGE_LENGTH_LIMIT: 4096,
    RATE_LIMIT: {
        windowMs: 60000,
        max: 20
    },

    ADMIN_IDS: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(Number) : [],

    DATE_FORMAT: 'YYYY-MM-DD',
    CURRENCY_DECIMALS: 2,
    
    MESSAGES: {
        START: `👋 Hi, I'm *ENS Ledger Bot*, here to help you track and analyze transactions within the ENS DAO.

- Use the *Latest* menu to view recent transactions.
- Access historical data in the *Historical* menu by selecting the working group you're interested in and specifying the time period.
- If you're looking for a specific transaction or recipient, use the *Search* menu.

You can also /subscribe to receive updates about current transactions directly from me.

Enjoy using the bot!`,
        ERROR: `❌ Error occurred. Try again.`,  
        NO_DATA: `🔍 Nothing found.`,  
        RATE_LIMIT: `⏳ Too many requests. Wait a minute.`
    }
};