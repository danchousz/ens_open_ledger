import express from 'express';
import { getBigPictureData, getQuarterData, getWalletData, getCategorySankeyData, getYearData } from '../services/sankeyService.mjs';

const router = express.Router();

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

router.get('/category-sankey-data/:category/:quarter', (req, res) => {
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

export { router as sankeyRoutes };