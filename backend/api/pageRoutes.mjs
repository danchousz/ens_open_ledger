import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const sendIndexHtml = (req, res) => {
    res.sendFile(path.join(__dirname, '../..', 'frontend', 'index.html'));
};

router.get('/', sendIndexHtml);
router.get('/fullview', sendIndexHtml);
router.get('/quarter/:quarter', sendIndexHtml);
router.get('/quarter/:quarter/:wallet', sendIndexHtml);
router.get('/year/:year', sendIndexHtml);
router.get('/category/:quarter/:category', sendIndexHtml);

export { router as pageRoutes };