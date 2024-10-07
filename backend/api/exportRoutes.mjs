import express from 'express';
import { exportData } from '../services/exportService.mjs';

const router = express.Router();

router.get('/export-data', (req, res) => {
    const view = req.query.view;
    const filter = req.query.filter;
    const quarter = req.query.quarter;

    try {
        const exportedData = exportData(view, filter, quarter);
        res.json(exportedData);
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).send('Internal Server Error');
    }
});

export { router as exportRoutes };