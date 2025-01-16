import express from 'express';
import { 
    getBigPictureData, 
    getQuarterData, 
    getWalletData, 
    getCategorySankeyData, 
    getYearData, 
    getYearWalletData, 
    getYearCategoryData 
} from '../services/sankeyService.mjs';
import { cacheManager } from '../utils/cacheManager.mjs';

const router = express.Router();

router.use((req, res, next) => {
    if (!cacheManager.isInitialized) {
        console.log('Warning: Cache is not initialized yet, using direct computation');
    }
    next();
});

router.get('/data/big_picture', (req, res) => {
    try {
        const hideMode = req.query.hideMode === 'true';
        const sankeyData = getBigPictureData(hideMode);
        res.json(sankeyData);
    } catch (error) {
        console.error('Error creating Sankey data:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/data/:quarter', (req, res) => {
    try {
        const quarter = req.params.quarter;
        const sankeyData = getQuarterData(quarter);
        res.json(sankeyData);
    } catch (error) {
        console.error('Error creating Sankey data:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/data/year/:year', (req, res) => {
    try {
        const year = req.params.year;
        const sankeyData = getYearData(year);
        res.json(sankeyData);
    } catch (error) {
        console.error('Error creating yearly Sankey data:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/data/:quarter/:wallet', (req, res) => {
    try {
        const quarter = req.params.quarter;
        const walletFilter = req.params.wallet;
        const sankeyData = getWalletData(quarter, walletFilter);
        res.json(sankeyData);
    } catch (error) {
        console.error('Error creating Sankey data:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/category-sankey-data/quarter/:quarter/category/:category', (req, res) => {
    try {
        const category = req.params.category;
        const quarter = req.params.quarter;
        const sankeyData = getCategorySankeyData(category, quarter);
        res.json(sankeyData);
    } catch (error) {
        console.error('Error creating category Sankey data:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/category-sankey-data/year/:year/category/:category', (req, res) => {
    try {
        const category = req.params.category;
        const year = req.params.year;
        const sankeyData = getYearCategoryData(category, year);
        res.json(sankeyData);
    } catch (error) {
        console.error('Error creating yearly category Sankey data:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/data/year/:year/:wallet', (req, res) => {
    try {
        const year = req.params.year;
        const walletFilter = req.params.wallet;
        const sankeyData = getYearWalletData(year, walletFilter);
        res.json(sankeyData);
    } catch (error) {
        console.error('Error creating yearly wallet Sankey data:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/cache/stats', (req, res) => {
    try {
        const stats = cacheManager.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting cache stats:', error);
        res.status(500).send('Internal Server Error');
    }
});

export { router as sankeyRoutes };