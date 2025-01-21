import express from 'express';
import path from 'path';

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
const port = 3000;

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