import express from 'express';
import { getRecipientDetails } from '../services/recipientDetailsService.mjs';

const router = express.Router();

router.get('/recipient_details/:recipient', (req, res) => {
    const recipient = req.params.recipient;
    const isCategory = req.query.isCategory === 'true';
    const isSpecialWallet = req.query.isSpecialWallet === 'true';
    
    try {
        const result = getRecipientDetails(recipient, isCategory, isSpecialWallet);
        res.json(result);
    } catch (error) {
        console.error('Error getting recipient details:', error);
        res.status(500).send('Internal Server Error');
    }
});

export { router as recipientRoutes };