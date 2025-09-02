import cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { runAvatarParser, clearCache } from '../services/avatarService.mjs';
import { cacheManager } from './cacheManager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pythonPath = path.join(__dirname, '../..', 'venv', 'bin', 'python3');
const dataMergerPath = path.join(__dirname, '../..', 'scripts', 'data_miner', 'src', 'main.py');
const dataMinerPath = path.join(__dirname, '../..', 'scripts', 'data_miner', 'src', 'services', 'miner.py');
const dailyStreamGrouperScriptPath = path.join(__dirname, '../..', 'scripts', 'data_miner', 'src', 'contracts', 'spp.py');

function runPythonScript(scriptPath) {
    return new Promise((resolve, reject) => {
        exec(`${pythonPath} ${scriptPath}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing ${path.basename(scriptPath)}: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr) {
                console.error(`stderr from ${path.basename(scriptPath)}: ${stderr}`);
            }
            console.log(`stdout from ${path.basename(scriptPath)}: ${stdout}`);
            resolve(stdout);
        });
    });
}

async function handleMergerCompletion() {
    console.log('Merger completed, waiting 3 minutes before updating cache...');
    
    await new Promise(resolve => setTimeout(resolve, 180000));
    
    console.log('Starting cache update after merger...');
    try {
        await cacheManager.updateAllCacheData();
        console.log('Cache successfully updated after merger');
    } catch (error) {
        console.error('Failed to update cache after merger:', error);
    }
}

export function initializeCronJobs() {
    // Run data merger every 2 hours
    cron.schedule('10 */2 * * *', async () => {
        try {
            await runPythonScript(dataMergerPath);
            await handleMergerCompletion();
        } catch (error) {
            console.error('Error in merger cron job:', error);
        }
    });

    // Run data miner every 2 hours, 10 minute after the merger
    cron.schedule('0 */2 * * *', () => {
        runPythonScript(dataMinerPath);
    });

    // Run daily stream grouper every day at midnight
    cron.schedule('0 0 * * *', () => {
        runPythonScript(dailyStreamGrouperScriptPath);
    });

    // Run avatar parser every Sunday at midnight
    cron.schedule('0 0 * * 0', () => {
        runAvatarParser();
    });

    // Clear avatar cache on the first day of every month at midnight
    cron.schedule('0 0 1 * *', () => {
        clearCache();
    });

    console.log('Cron jobs initialized');

    cacheManager.initialize().catch(error => {
        console.error('Failed to initialize cache:', error);
    });
}