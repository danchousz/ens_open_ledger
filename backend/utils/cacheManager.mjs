import NodeCache from 'node-cache';
import { 
    getBigPictureData, 
    getQuarterData, 
    getWalletData, 
    getCategorySankeyData, 
    getYearData, 
    getYearWalletData, 
    getYearCategoryData 
} from '../services/sankeyService.mjs';
import { getData } from '../utils/dataLoader.mjs';

class CacheManager {
    constructor() {
        this.cache = new NodeCache({ 
            stdTTL: 0,
            useClones: false
        });
        
        this.isInitialized = false;
        this.lastUpdateTime = null;
    }

    logWithTimestamp(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] CacheManager: ${message}`);
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        this.logWithTimestamp('Starting initial cache population...');
        
        try {
            await this.updateAllCacheData();
            this.isInitialized = true;
            this.logWithTimestamp('Cache initialization completed');
        } catch (error) {
            this.logWithTimestamp(`Cache initialization failed: ${error.message}`);
            throw error;
        }
    }

    async updateAllCacheData() {
        const startTime = process.hrtime();
        this.logWithTimestamp('Starting cache update...');

        try {
            const df = getData();
            
            const quarters = new Set();
            const years = new Set();
            const categories = new Set();
            const wallets = new Set();
            
            df.forEach(row => {
                if (row.Quarter) {
                    quarters.add(row.Quarter);
                    const year = row.Quarter.split('Q')[0];
                    years.add(year);
                }
                if (row.To_category) categories.add(row.To_category);
                if (row.From_category) categories.add(row.From_category);
            });

            this.cache.set('big_picture_false', getBigPictureData(false));
            this.cache.set('big_picture_true', getBigPictureData(true));

            for (const quarter of quarters) {
                this.cache.set(`quarter_${quarter}`, getQuarterData(quarter));
                
                for (const wallet of wallets) {
                    this.cache.set(`quarter_wallet_${quarter}_${wallet}`, 
                        getWalletData(quarter, wallet));
                }
                
                for (const category of categories) {
                    this.cache.set(`quarter_category_${quarter}_${category}`, 
                        getCategorySankeyData(category, quarter));
                }
            }

            for (const year of years) {
                this.cache.set(`year_${year}`, getYearData(year));
                
                for (const wallet of wallets) {
                    this.cache.set(`year_wallet_${year}_${wallet}`, 
                        getYearWalletData(year, wallet));
                }
                
                for (const category of categories) {
                    this.cache.set(`year_category_${year}_${category}`, 
                        getYearCategoryData(category, year));
                }
            }

            const endTime = process.hrtime(startTime);
            const updateTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
            
            this.lastUpdateTime = new Date();
            
            this.logWithTimestamp(`Cache update completed in ${updateTime}ms`);
            this.logWithTimestamp(`Total cached entries: ${this.cache.keys().length}`);
            
            return true;
        } catch (error) {
            this.logWithTimestamp(`Cache update failed: ${error.message}`);
            throw error;
        }
    }

    get(key) {
        const data = this.cache.get(key);
        if (data) {
            this.logWithTimestamp(`Cache HIT for key: ${key}`);
            return data;
        }
        this.logWithTimestamp(`Cache MISS for key: ${key}`);
        return null;
    }

    set(key, value) {
        this.cache.set(key, value);
        this.logWithTimestamp(`New data cached for key: ${key}`);
    }

    getStats() {
        const stats = this.cache.getStats();
        const keys = this.cache.keys();
        return {
            stats,
            keys,
            totalEntries: keys.length,
            cacheSize: process.memoryUsage().heapUsed / 1024 / 1024,
            uptime: process.uptime(),
            isInitialized: this.isInitialized,
            lastUpdateTime: this.lastUpdateTime
        };
    }

    clearCache() {
        const keysCount = this.cache.keys().length;
        this.cache.flushAll();
        this.logWithTimestamp(`Cache cleared. ${keysCount} entries removed.`);
        return keysCount;
    }
}

const cacheManager = new CacheManager();

export { cacheManager };