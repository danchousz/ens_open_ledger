import fs from 'fs';
import path from 'path';

export class FileService {
    constructor(tempDir = '/tmp') {
        this.tempDir = tempDir;
        this.cleanup = new Set();
        
        setInterval(() => this.performCleanup(), 600000);
    }

    async createTempFile(data, extension, baseName = 'export') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        const filename = `${baseName}_${timestamp}_${random}.${extension}`;
        const filepath = path.join(this.tempDir, filename);
        
        await fs.promises.writeFile(filepath, data);
        this.cleanup.add({ filepath, createdAt: Date.now() });
        
        setTimeout(() => this.deleteTempFile(filepath), 900000);
        
        return filepath;
    }

    async deleteTempFile(filepath) {
        try {
            await fs.promises.unlink(filepath);
            this.cleanup = new Set([...this.cleanup].filter(item => item.filepath !== filepath));
            console.log(`Temp file deleted: ${filepath}`);
        } catch (error) {
            console.warn('Failed to delete temp file:', filepath, error.message);
        }
    }

    performCleanup() {
        const now = Date.now();
        const maxAge = 30 * 60 * 1000;
        
        for (const item of this.cleanup) {
            if (now - item.createdAt > maxAge) {
                this.deleteTempFile(item.filepath);
            }
        }
    }

    getStats() {
        return {
            totalFiles: this.cleanup.size,
            files: [...this.cleanup].map(item => ({
                path: item.filepath,
                age: Date.now() - item.createdAt
            }))
        };
    }
}