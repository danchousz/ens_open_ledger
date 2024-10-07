import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const avatarParserPath = path.join(__dirname, '../..', 'scripts', 'avatar_parser', 'parser.mjs');
const CACHE_FILE = path.join(__dirname, '../..', 'scripts', 'avatar_parser', 'ens_avatar_cache.json');

export function runAvatarParser() {
    return new Promise((resolve, reject) => {
        exec(`node ${avatarParserPath}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing avatar parser: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr) {
                console.error(`stderr from avatar parser: ${stderr}`);
            }
            console.log(`stdout from avatar parser: ${stdout}`);
            resolve(stdout);
        });
    });
}

export function clearCache() {
    if (fs.existsSync(CACHE_FILE)) {
        fs.unlinkSync(CACHE_FILE);
    }
}

export function getAvatarPath(filename, type) {
    const avatarFolder = type === 'static' ? 'static_avatars' : 'parsed_avatars';
    return path.join(__dirname, '../..', 'frontend', 'components', 'avatars', avatarFolder, filename);
}