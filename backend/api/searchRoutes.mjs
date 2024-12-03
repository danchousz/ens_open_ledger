import express from 'express';
import { getData } from '../utils/dataLoader.mjs';

const router = express.Router();

router.get('/api/search', (req, res) => {
    const searchTerm = req.query.term.toLowerCase();
    const df = getData();
    
    try {
        const nameMap = new Map();
        
        df.forEach(row => {
            if (row.To && 
                row.To_name && 
                row['Transaction Hash'] !== 'Interquarter' &&
                !row['Transaction Hash'].startsWith('Unspent'))
            {
                if (!row.To_name.startsWith('0x') || row.To_name.length > 10) {
                    nameMap.set(row.To_name.toLowerCase(), row.To_name);
                }
            }
        });
 
        let matches = [];
        
        if (searchTerm.startsWith('0x') && searchTerm.length > 10) {
            matches = Array.from(df
                .filter(row => row.To.toLowerCase().includes(searchTerm))
                .map(row => row.To_name)
                .filter(Boolean));
        } else {
            const searchWords = searchTerm.split(/\s+/);
            
            matches = Array.from(nameMap.values()).filter(name => {
                const nameLower = name.toLowerCase();
                
                if (searchTerm.endsWith('.eth')) {
                    const searchWithoutEth = searchTerm.slice(0, -4);
                    if (nameLower.includes(searchWithoutEth)) return true;
                }
                
                if (!searchTerm.endsWith('.eth') && nameLower.includes(searchTerm + '.eth')) {
                    return true;
                }
 
                return searchWords.some(word => {
                    if (word.length < 2) return false;
                    
                    const wordMatches = nameLower.includes(word.toLowerCase());
                    const wordWithEthMatches = nameLower.includes(word.toLowerCase() + '.eth');
                    
                    return wordMatches || wordWithEthMatches;
                });
            });
        }
 
        matches = [...new Set(matches)]
            .filter(Boolean)
            .slice(0, 10)
            .map(name => ({ name }));
            
        res.json(matches);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
 });


export { router as searchRoutes };