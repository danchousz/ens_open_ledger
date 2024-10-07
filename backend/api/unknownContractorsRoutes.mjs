import express from 'express';
import { getUnknownContractorsData } from '../utils/dataLoader.mjs';

const router = express.Router();

router.get('/unknown_contractors', (req, res) => {
    try {
        const unknownContractors = getUnknownContractorsData();
        res.json(unknownContractors);
    } catch (error) {
        console.error('Error getting unknown contractors data:', error);
        res.status(500).send('Internal Server Error');
    }
});

export { router as unknownContractorsRoutes };