import express from 'express';
import { saveTransaction } from '../utils/responseSaver.mjs';

const router = express.Router();

router.post('/save_transaction', (req, res) => {
    console.log('Received transaction data:', req.body);
    const transactionData = req.body;
    saveTransaction(transactionData, (err, result) => {
        if (err) {
            console.error('Error saving transaction:', err);
            res.status(500).json({ error: "Error saving transaction" });
        } else {
            res.json(result);
        }
    });
});

export { router as saveResponseRoutes };