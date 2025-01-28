import express from 'express';
import path from 'path';
import cors from 'cors';

import { avatarRoutes } from './api/avatarRoutes.mjs';
import { sankeyRoutes } from './api/sankeyRoutes.mjs';
import { loadData } from './utils/dataLoader.mjs';
import { recipientRoutes } from './api/recipientDetailsRoutes.mjs';
import { exportRoutes } from './api/exportRoutes.mjs';;
import { dropdownRoutes } from './api/dropdownRoutes.mjs';
import { pageRoutes } from './api/pageRoutes.mjs';
import { initializeCronJobs } from './utils/cronJobs.mjs';
import { searchRoutes } from './api/searchRoutes.mjs';
import { invoicesRoutes } from './api/invoicesRoutes.mjs';
import { telegramRoutes } from './api/telegramRoutes.mjs';
import { safeRoutes } from './api/safeRoutes.mjs';

import { startBot } from './bot/telegram/index.mjs';

loadData();
initializeCronJobs();

const app = express();
const port = 3001;

app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], // разрешаем запросы с localhost:3000
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // разрешенные методы
    allowedHeaders: ['Content-Type', 'Authorization'] // разрешенные заголовки
  }));

app.use(express.json());

app.use(pageRoutes);

app.use(express.static(path.join('..', 'frontend')));

app.use(sankeyRoutes);
app.use(avatarRoutes);
app.use(recipientRoutes);
app.use(exportRoutes);
app.use(dropdownRoutes);
app.use(searchRoutes);
app.use(invoicesRoutes);
app.use(telegramRoutes);
app.use(safeRoutes);

app.listen(port, '0.0.0.0', async () => {
    console.log(`Server running at port ${port}`);
    startBot();
});