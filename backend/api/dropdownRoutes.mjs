import express from 'express';
import { getContractorsData } from '../services/dropdownService.mjs';

const router = express.Router();

router.get('/contractors/:category', (req, res) => {
    const category = req.params.category;
    const quarter = req.query.quarter;
    const sender = req.query.sender;
    let isYear = false;

    if (quarter.match(/^\d{4}$/)) {
        isYear = true;
    }
    try {
        const result = getContractorsData(category, quarter, sender, isYear);
        res.json(result);
    } catch (error) {
        console.error('Error getting contractors data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export { router as dropdownRoutes };