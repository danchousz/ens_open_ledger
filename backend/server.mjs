import express from 'express';
import path from 'path';

import { avatarRoutes } from './api/avatarRoutes.mjs';
import { sankeyRoutes } from './api/sankeyRoutes.mjs';
import { loadData, loadUnknownContractorsData } from './utils/dataLoader.mjs';
import { recipientRoutes } from './api/recipientDetailsRoutes.mjs';
import { exportRoutes } from './api/exportRoutes.mjs';
import { unknownContractorsRoutes } from './api/unknownContractorsRoutes.mjs';
import { saveResponseRoutes } from './api/saveResponseRoutes.mjs';
import { dropdownRoutes } from './api/dropdownRoutes.mjs';
import { pageRoutes } from './api/pageRoutes.mjs';
import { initializeCronJobs } from './utils/cronJobs.mjs';

loadData();
loadUnknownContractorsData();
initializeCronJobs();

const app = express();
const port = 3000;

app.use(express.static(path.join('..', 'frontend')));
app.use(express.json());

app.use(pageRoutes);
app.use(sankeyRoutes);
app.use(avatarRoutes);
app.use(recipientRoutes);
app.use(exportRoutes);
app.use(unknownContractorsRoutes);
app.use(saveResponseRoutes);
app.use(dropdownRoutes);

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at port ${port}`);
});