import express from 'express';
import { getData } from '../utils/dataLoader.mjs';

const router = express.Router();

class CategoriesCache {
    constructor() {
        this.cachedData = null;
        this.lastUpdate = null;
        
        this.updateCache();
        this.scheduleNextUpdate();
    }

    scheduleNextUpdate() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const timeUntilNextUpdate = tomorrow - now;
        setTimeout(() => {
            this.updateCache();
            this.scheduleNextUpdate();
        }, timeUntilNextUpdate);
    }

    updateCache() {
        try {
            const data = getData();
            const uniqueCategories = new Set();

            const excludedCategories = [
                "Community WG",
                "DAO Wallet",
                "UniSwap",
                "CoW Swap",
                "Dissolution",
                "ENS Labs",
                "Ecosystem",
                "Invalid Names Ref.",
                "Metagov",
                "Plchld",
                "Public Goods",
                "Ref. Accidental Txs",
                "Stream",
            ];

            data.forEach(item => {
                if (item.To_category && 
                    !item.To_category.startsWith('Unspent') && 
                    !excludedCategories.includes(item.To_category)) {
                    uniqueCategories.add(item.To_category);
                }
            });

            this.cachedData = {
                success: true,
                categories: Array.from(uniqueCategories).sort(),
                total: uniqueCategories.size,
                lastUpdated: new Date().toISOString()
            };

            this.lastUpdate = new Date();
            console.log(`Cache updated at ${this.lastUpdate}`);
        } catch (error) {
            console.error('Failed to update cache:', error);
            if (!this.cachedData) {
                this.cachedData = {
                    success: false,
                    error: 'Failed to initialize cache',
                    message: error.message
                };
            }
        }
    }

    getData() {
        return this.cachedData;
    }
}

const categoriesCache = new CategoriesCache();

router.get('/safe/unique_categories', (req, res) => {
    const cachedResponse = categoriesCache.getData();
    
    if (!cachedResponse.success) {
        return res.status(500).json(cachedResponse);
    }
    
    res.json(cachedResponse);
});

export { router as safeRoutes };