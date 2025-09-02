import express from 'express';
import path from 'path';
import cors from 'cors';
import { avatarRoutes } from './api/avatarRoutes.mjs';
import { sankeyRoutes } from './api/sankeyRoutes.mjs';
import { loadData } from './utils/dataLoader.mjs';
import { recipientRoutes } from './api/recipientDetailsRoutes.mjs';
import { exportRoutes } from './api/exportRoutes.mjs'; // ← убрать лишний ;
import { dropdownRoutes } from './api/dropdownRoutes.mjs';
import { pageRoutes } from './api/pageRoutes.mjs';
import { initializeCronJobs } from './utils/cronJobs.mjs';
import { searchRoutes } from './api/searchRoutes.mjs';
import { invoicesRoutes } from './api/invoicesRoutes.mjs';
import { telegramRoutes } from './api/telegramRoutes.mjs';
import { safeRoutes } from './api/safeRoutes.mjs';
import { startBot } from './bot/telegram/index.mjs';

const app = express();
const port = 3000;
let server;
let bot;

async function startServer() {
    try {
        // 1. Сначала загружаем данные
        console.log('Loading data...');
        await loadData();
        
        // 2. Инициализируем cron jobs
        console.log('Initializing cron jobs...');
        initializeCronJobs();
        
        // 3. Настраиваем Express
        app.use(cors({
            origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
        
        app.use(express.json());
        app.use(pageRoutes);
        app.use(express.static(path.join('..', 'frontend')));
        
        // API routes
        app.use(sankeyRoutes);
        app.use(avatarRoutes);
        app.use(recipientRoutes);
        app.use(exportRoutes);
        app.use(dropdownRoutes);
        app.use(searchRoutes);
        app.use(invoicesRoutes);
        app.use(telegramRoutes);
        app.use(safeRoutes);
        
        // 4. Стартуем сервер
        server = app.listen(port, '0.0.0.0', () => {
            console.log(`✅ Server running at port ${port}`);
        });
        
        // 5. Стартуем бота ПОСЛЕ сервера
        console.log('Starting Telegram bot...');
        bot = await startBot();
        console.log('✅ Telegram bot started successfully');
        
    } catch (error) {
        console.error('❌ Error starting server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    
    if (bot) {
        console.log('Stopping Telegram bot...');
        await bot.stopPolling();
    }
    
    if (server) {
        console.log('Stopping HTTP server...');
        server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    // Same logic as SIGINT
});

// Start the application
startServer();