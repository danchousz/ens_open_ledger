import cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { runAvatarParser, clearCache } from '../services/avatarService.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pythonPath = path.join(__dirname, '../..', 'venv', 'bin', 'python3');
const dataMergerPath = path.join(__dirname, '../..', 'scripts', 'data_miner', 'merger.py');
const dataMinerPath = path.join(__dirname, '../..', 'scripts', 'data_miner', 'new_miner.py');
const dailyStreamGrouperScriptPath = path.join(__dirname, '../..', 'scripts', 'data_miner', 'stream_grouper.py');

function runPythonScript(scriptPath) {
    exec(`${pythonPath} ${scriptPath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing ${path.basename(scriptPath)}: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr from ${path.basename(scriptPath)}: ${stderr}`);
        }
        console.log(`stdout from ${path.basename(scriptPath)}: ${stdout}`);
    });
}

export function initializeCronJobs() {
    // Run data merger every 2 hours
    cron.schedule('0 */2 * * *', () => {
        runPythonScript(dataMergerPath);
    });

    // Run data miner every 2 hours, 1 minute after the merger
    cron.schedule('1 */2 * * *', () => {
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

    // Clear cache on the first day of every month at midnight
    cron.schedule('0 0 1 * *', () => {
        clearCache();
    });

    console.log('Cron jobs initialized');
}