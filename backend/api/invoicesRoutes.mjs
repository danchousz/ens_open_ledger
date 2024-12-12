import express from 'express';
import { bucket } from '../config/gsc/gcs.mjs';

const router = express.Router();

router.get('/api/check-invoice/:txHash/:address?', async (req, res) => {
    try {
        const { txHash, address } = req.params;
        
        // Сначала проверяем существование общего файла для всех
        const commonFilename = `${txHash}.pdf`;
        const commonFile = bucket.file(commonFilename);
        const [commonExists] = await commonFile.exists();

        if (commonExists) {
            // Если существует общий файл, генерируем URL для него
            const [signedUrl] = await commonFile.getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + 60 * 60 * 1000,
            });

            res.json({
                exists: true,
                url: signedUrl,
                type: 'common'
            });
            return;
        }

        if (address) {
            const personalFilename = `${txHash}_${address}.pdf`;
            const personalFile = bucket.file(personalFilename);
            const [personalExists] = await personalFile.exists();

            if (personalExists) {
                const [signedUrl] = await personalFile.getSignedUrl({
                    version: 'v4',
                    action: 'read',
                    expires: Date.now() + 60 * 60 * 1000,
                });

                res.json({
                    exists: true,
                    url: signedUrl,
                    type: 'personal'
                });
                return;
            }
        }
        res.json({ exists: false });

    } catch (error) {
        console.error('Error checking invoice:', error);
        res.status(500).json({ error: 'Failed to check invoice' });
    }
});

router.get('/api/invoice-recipients/:txHash', async (req, res) => {
    try {
        const { txHash } = req.params;
        
        const [files] = await bucket.getFiles({
            prefix: txHash
        });

        // Обрабатываем результаты
        const recipients = files.map(file => {
            const filename = file.name;
            if (filename === `${txHash}.pdf`) {
                // Это общий файл
                return {
                    type: 'common',
                    filename
                };
            } else {
                // Это персональный файл
                const address = filename.replace(`${txHash}_`, '').replace('.pdf', '');
                return {
                    type: 'personal',
                    address,
                    filename
                };
            }
        });

        res.json({ recipients });

    } catch (error) {
        console.error('Error getting recipients:', error);
        res.status(500).json({ error: 'Failed to get recipients' });
    }
});

// Модифицированный эндпоинт для загрузки
router.post('/api/upload-invoice', async (req, res) => {
    try {
        const { txHash, address, fileBuffer } = req.body;
        const filename = address ? `${txHash}_${address}.pdf` : `${txHash}.pdf`;
        
        const file = bucket.file(filename);
        const stream = file.createWriteStream({
            metadata: {
                contentType: 'application/pdf'
            }
        });

        stream.on('error', (err) => {
            console.error(err);
            res.status(500).json({ error: 'Upload failed' });
        });

        stream.on('finish', () => {
            res.json({ 
                success: true,
                filename,
                type: address ? 'personal' : 'common'
            });
        });

        stream.end(fileBuffer);
    } catch (error) {
        console.error('Error uploading invoice:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

export { router as invoicesRoutes };