import { ApiService } from '../services/ApiService.mjs';
import { createPeriodKeyboard, createQuartersKeyboard, createYearsKeyboard, createFormatKeyboard } from '../utils/keyboards.mjs';
import { config } from '../../config/cfg.mjs';

const apiService = new ApiService(config.API_URL);

export const setupHistoricalCommands = (bot, stateService) => {
    
    bot.on('message', async (msg) => {
        if (!msg.text) return;
        
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const userState = stateService.getState(userId);

        if (msg.text.startsWith('Historical: ')) {
            const category = msg.text.replace('Historical: ', '');
            
            stateService.setState(userId, {
                ...userState,
                category: category,
                menuContext: 'historical',
                type: 'historical_data'
            });
            
            await bot.sendMessage(chatId, 'Select period:', {
                reply_markup: createPeriodKeyboard()
            });
            return;
        }

        switch (msg.text) {
            case '📊 Specific quarter':
                if (!userState?.category) {
                    await bot.sendMessage(chatId, 'Please select category first');
                    return;
                }
                
                const quarters = await getAvailableQuarters(userState.category);
                if (quarters.length === 0) {
                    await bot.sendMessage(chatId, 'No data available for this category');
                    return;
                }
                
                await bot.sendMessage(chatId, 'Select quarter:', {
                    reply_markup: createQuartersKeyboard(quarters)
                });
                break;

            case '📅 Specific year':
                if (!userState?.category) {
                    await bot.sendMessage(chatId, 'Please select category first');
                    return;
                }
                
                const years = await getAvailableYears(userState.category);
                if (years.length === 0) {
                    await bot.sendMessage(chatId, 'No data available for this category');
                    return;
                }
                
                await bot.sendMessage(chatId, 'Select year:', {
                    reply_markup: createYearsKeyboard(years)
                });
                break;

            case '📈 All time':
                stateService.setState(userId, {
                    ...userState,
                    period: 'All time'
                });
                
                await bot.sendMessage(chatId, 'Select format:', {
                    reply_markup: createFormatKeyboard(true)
                });
                break;
        }

        if (msg.text.match(/^Q[1-4] \d{4}$/) || msg.text.match(/^\d{4}$/)) {
            stateService.setState(userId, {
                ...userState,
                period: msg.text
            });
            
            await bot.sendMessage(chatId, 'Select format:', {
                reply_markup: createFormatKeyboard(true)
            });
        }
    });
};

async function getAvailableQuarters(category) {
    try {
        const data = await apiService.getQuarters(category);
        return data.quarters;
    } catch (error) {
        console.error('Error fetching quarters:', error);
        return [];
    }
}

async function getAvailableYears(category) {
    try {
        const data = await apiService.getYears(category);
        return data.years;
    } catch (error) {
        console.error('Error fetching years:', error);
        return [];
    }
}