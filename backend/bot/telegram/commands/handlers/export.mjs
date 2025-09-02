import { ApiService } from '../services/ApiService.mjs';
import { FileService } from '../services/FileService.mjs';
import { createFormatKeyboard, createSearchKeyboard, createMainKeyboard } from '../utils/keyboards.mjs';
import { config } from '../../config/cfg.mjs';

const apiService = new ApiService(config.API_URL);
const fileService = new FileService();

export const setupExportCommands = (bot, stateService) => {
    
    bot.on('message', async (msg) => {
        if (!msg.text) return;
        
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (['📗 XLSX', '📄 CSV', '📤 JSON'].includes(msg.text)) {
            await handleExportFormat(bot, chatId, userId, msg.text, stateService);
        }
    });
};

async function handleExportFormat(bot, chatId, userId, formatText, stateService) {
    try {
        const userData = stateService.getState(userId);
        if (!userData?.category) {
            await bot.sendMessage(chatId, 'Please select category and period first');
            return;
        }

        const format = getFormatFromText(formatText);
        const loadingMsg = await bot.sendMessage(chatId, '⏳ Preparing your file...');

        if (userData.type === 'recipient_data') {
            await exportRecipientData(bot, chatId, userData, format, loadingMsg);
            
            await bot.sendMessage(chatId, 'Select search type:', {
                reply_markup: createSearchKeyboard()
            });
        } else {
            await exportHistoricalData(bot, chatId, userData, format, loadingMsg);
            
            await bot.sendMessage(chatId, 'Choose action:', {
                reply_markup: createMainKeyboard()
            });
        }
        
        stateService.clearState(userId);

    } catch (error) {
        console.error('Error exporting data:', error);
        await bot.sendMessage(chatId, '❌ Error exporting data. Please try again.');
    }
}

async function exportRecipientData(bot, chatId, userData, format, loadingMsg) {
    const data = await apiService.exportRecipientData(userData.recipient, format);
    
    const tempFile = await fileService.createTempFile(
        Buffer.from(data), 
        format, 
        `${userData.recipientName}_transactions`
    );
    
    await bot.deleteMessage(chatId, loadingMsg.message_id);
    
    await bot.sendDocument(chatId, tempFile, {
        caption: `Transaction history for ${userData.recipientName}`
    });
    
    await fileService.deleteTempFile(tempFile);
}

async function exportHistoricalData(bot, chatId, userData, format, loadingMsg) {
    if (!userData.period) {
        await bot.editMessageText('Please select period first', {
            chat_id: chatId,
            message_id: loadingMsg.message_id
        });
        return;
    }

    let periodParam = formatPeriodParam(userData.period);
    
    const data = await apiService.exportData(userData.category, periodParam, format);
    
    const filename = `${userData.category}_${periodParam}`;
    const tempFile = await fileService.createTempFile(
        Buffer.from(data), 
        format, 
        filename
    );
    
    await bot.deleteMessage(chatId, loadingMsg.message_id);
    
    await bot.sendDocument(chatId, tempFile, {
        caption: `Historical data for ${userData.category} (${userData.period})`
    });
    
    await fileService.deleteTempFile(tempFile);
}

function getFormatFromText(formatText) {
    if (formatText.includes('XLSX')) return 'xlsx';
    if (formatText.includes('CSV')) return 'csv';
    if (formatText.includes('JSON')) return 'json';
    throw new Error('Unknown format');
}

function formatPeriodParam(period) {
    if (period === 'All time') {
        return 'all';
    } else if (period.includes('Q')) {
        const [quarter, year] = period.split(' ');
        return `${year}${quarter}`;
    } else if (period.includes(':')) {
        const [startDate, endDate] = period.split(':');
        return `${startDate}_to_${endDate}`;
    } else {
        return period;
    }
}