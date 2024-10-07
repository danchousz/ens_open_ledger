import express from 'express';
import { getAvatarPath } from '../services/avatarService.mjs';

const router = express.Router();

router.get('/avatars/:filename', (req, res) => {
    const filename = req.params.filename;
    const avatarPath = getAvatarPath(filename);
    
    res.sendFile(avatarPath, (err) => {
        if (err) {
            res.status(404).send('No avatar. Using placeholder from jakerunzer.com.');
        }
    });
});

router.get('/static_avatars/:filename', (req, res) => {
    const filename = req.params.filename;
    const avatarPath = getAvatarPath(filename, 'static');
    
    res.sendFile(avatarPath, (err) => {
        if (err) {
            res.status(404).send('No avatar. Using placeholder from jakerunzer.com.');
        }
    });
});

export { router as avatarRoutes };