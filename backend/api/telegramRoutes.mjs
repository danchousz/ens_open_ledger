import express from 'express';
import { getData } from '../utils/dataLoader.mjs';
import ExcelJS from 'exceljs';
import { Parser } from 'json2csv';
import { filterTransactions } from '../bot/telegram/commands.mjs'

const router = express.Router();


router.get('/api/telegram/transactions', (req, res) => {
    try {
        const data = getData(false, true);
        const filteredData = filterTransactions(data, true);
        
        const transformedData = filteredData.map(tx => ({
            hash: tx['Transaction Hash'],
            date: tx['Date'],
            from: tx['From'],
            from_name: tx['From_name'] || tx['From'],
            to: tx['To'],
            to_name: tx['To_name'] || tx['To'],
            amount: tx['Value'],
            symbol: tx['Symbol'] || '',
            quarter: tx['Quarter'],
            dot_usd: tx['DOT_USD'] ? `${tx['DOT_USD']}` : '',
            category: tx['To_category'] || 'Unknown',
            Thru: tx['Thru'] || 'Direct'
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            success: true,
            count: transformedData.length,
            data: transformedData
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
    }
});

router.get('/api/telegram/transactions/:address', (req, res) => {
    try {
        const { address } = req.params;
        const data = getData();
        const filteredData = filterTransactions(data).filter(tx => 
            tx['From'].toLowerCase() === address.toLowerCase() || 
            tx['To'].toLowerCase() === address.toLowerCase()
        );

        const transformedData = filteredData.map(tx => ({
            hash: tx['Transaction Hash'],
            date: tx['Date'],
            from: tx['From'],
            to: tx['To'],
            amount: tx['Amount'],
            category: tx['To_category'] || 'Unknown',
            type: tx['From'].toLowerCase() === address.toLowerCase() ? 'sent' : 'received'
        }));

        res.json({
            success: true,
            address,
            count: transformedData.length,
            data: transformedData
        });
    } catch (error) {
        console.error('Error fetching transactions for address:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
    }
});


router.get('/api/telegram/quarters/:category', (req, res) => {
    try {
        const { category } = req.params;
        const data = getData();
        
        const filteredByRules = filterTransactions(data);
        
        const categoryTransactions = category === 'Whole DAO'
            ? filteredByRules
            : filteredByRules.filter(tx => 
                tx['From_name'] === category || tx['From'] === category
            );

        const quarters = [...new Set(categoryTransactions.map(tx => tx['Quarter']))]
            .filter(quarter => quarter)
            .sort((a, b) => b.localeCompare(a));

        res.json({
            success: true,
            quarters
        });
    } catch (error) {
        console.error('Error fetching quarters:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch quarters' });
    }
});

router.get('/api/telegram/transaction/:hash', (req, res) => {
    try {
        const { hash } = req.params;
        const data = getData();
        
        const filteredData = filterTransactions(data);
        
        const matchingTransactions = filteredData.filter(tx => 
            tx['Transaction Hash'].toLowerCase() === hash.toLowerCase()
        );

        const transformedData = matchingTransactions.map(tx => ({
            hash: tx['Transaction Hash'],
            date: tx['Date'],
            from: tx['From'],
            from_name: tx['From_name'] || tx['From'],
            to: tx['To'],
            to_name: tx['To_name'] || tx['To'],
            amount: tx['Value'],
            symbol: tx['Symbol'] || '',
            quarter: tx['Quarter'],
            dot_usd: tx['DOT_USD'] ? `${tx['DOT_USD']}` : '',
            category: tx['To_category'] || 'Unknown',
            Thru: tx['Thru'] || 'Direct'
        }));

        res.json({
            success: true,
            count: transformedData.length,
            data: transformedData
        });
    } catch (error) {
        console.error('Error searching transaction:', error);
        res.status(500).json({ success: false, error: 'Failed to search transaction' });
    }
});

router.get('/api/telegram/search', (req, res) => {
    const searchTerm = req.query.term.toLowerCase();
    const data = getData();
    
    try {
        const nameMap = new Map();
        
        data.forEach(row => {
            if (row.To && 
                row.To_name && 
                row['Transaction Hash'] !== 'Interquarter' &&
                !row['Transaction Hash'].startsWith('Unspent'))
            {
                if (!row.To_name.startsWith('0x') || row.To_name.length > 10) {
                    nameMap.set(row.To_name.toLowerCase(), {
                        name: row.To_name,
                        address: row.To
                    });
                }
            }
        });

        let matches = [];
        
        if (searchTerm.startsWith('0x')) {
            if (searchTerm.length === 42) {
                const matchingTx = data.find(row => 
                    row.To.toLowerCase() === searchTerm.toLowerCase()
                );
                if (matchingTx) {
                    matches = [{
                        name: matchingTx.To_name || matchingTx.To,
                        address: matchingTx.To
                    }];
                }
            } else if (searchTerm.length >= 10) {
                matches = Array.from(nameMap.values())
                    .filter(entry => entry.address.toLowerCase().includes(searchTerm));
            }
        } else {
            const searchWords = searchTerm.split(/\s+/);
            
            matches = Array.from(nameMap.values()).filter(entry => {
                const nameLower = entry.name.toLowerCase();
                
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

        matches = matches.slice(0, 10);
        
        res.json(matches);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/api/telegram/recipient/export/:recipient/:format', async (req, res) => {
    try {
        const { recipient, format } = req.params;
        const data = getData();
        const filteredData = filterTransactions(data, false);

        const transactions = filteredData.filter(tx => 
            tx['To_name'] === decodeURIComponent(recipient) || 
            tx['To'].toLowerCase() === recipient.toLowerCase()
        );

        if (transactions.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No transactions found for this recipient'
            });
        }


        const transformedData = transactions
            .map(tx => ({
                Date: tx['Date'],
                From: tx['From_name'] || tx['From'],
                Through: tx['Thru'],
                To: tx['To_name'] || tx['To'],
                Amount: tx['Value'],
                Symbol: tx['Symbol'] || '',
                Category: tx['To_category'] || 'Unknown',
                'Value': tx['DOT_USD'] ? `${tx['DOT_USD']}` : '',
                'Hash': tx['Transaction Hash']
            }))
            .sort((a, b) => new Date(b['Date']) - new Date(a['Date']));

        switch (format.toLowerCase()) {
            case 'xlsx': {
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Transactions');

                worksheet.columns = Object.keys(transformedData[0]).map(key => ({
                    header: key,
                    key: key,
                    width: 20
                }));

                worksheet.addRows(transformedData);

                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(recipient)}_transactions.xlsx`);
                
                await workbook.xlsx.write(res);
                break;
            }

            case 'csv': {
                const parser = new Parser({
                    fields: Object.keys(transformedData[0])
                });
                const csv = parser.parse(transformedData);
                
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(recipient)}_transactions.csv`);
                res.send(csv);
                break;
            }

            case 'json': {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(recipient)}_transactions.json`);
                res.json(transformedData);
                break;
            }

            default:
                res.status(400).json({ success: false, error: 'Invalid format' });
        }
    } catch (error) {
        console.error('Error exporting recipient data:', error);
        res.status(500).json({ success: false, error: 'Failed to export data' });
    }
});

router.get('/api/telegram/recipient/details/:identifier', (req, res) => {
    try {
        const { identifier } = req.params;
        const data = getData();
        const filteredData = filterTransactions(data);
        
        let transactions;
        if (identifier.startsWith('0x')) {
            if (identifier.length !== 42) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid address length. Ethereum address should be 42 characters (including 0x)'
                });
            }
            transactions = filteredData.filter(tx => 
                tx.To.toLowerCase() === identifier.toLowerCase()
            );
        } else {
            transactions = filteredData.filter(tx => 
                tx.To_name === identifier
            );
        }

        if (transactions.length === 0) {
            return res.json({
                success: false,
                error: 'Recipient not found'
            });
        }

        const recipient = transactions[0].To_name || transactions[0].To;
        const totalReceived = transactions.reduce((sum, tx) => 
            sum + (parseFloat(tx.DOT_USD) || 0), 0
        ).toFixed(2);

        res.json({
            success: true,
            recipient,
            address: transactions[0].To,
            transactionCount: transactions.length,
            totalReceived,
            transactions
        });

    } catch (error) {
        console.error('Error getting recipient details:', error);
        res.status(500).json({ success: false, error: 'Failed to get recipient details' });
    }
});

router.get('/api/telegram/years/:category', (req, res) => {
    try {
        const { category } = req.params;
        const data = getData();
        
        const filteredByRules = filterTransactions(data);
        
        const categoryTransactions = category === 'Whole DAO'
            ? filteredByRules
            : filteredByRules.filter(tx => 
                tx['From_name'] === category || tx['From'] === category
            );

        const years = [...new Set(categoryTransactions
            .map(tx => tx['Quarter'].slice(0, 4))
            .filter(year => year))]
            .sort((a, b) => b - a);

        res.json({
            success: true,
            years
        });
    } catch (error) {
        console.error('Error fetching years:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch years' });
    }
});

router.get('/api/telegram/export/:category/:period/:format', async (req, res) => {
    try {
        const { category, period, format } = req.params;
        const data = getData();
        
        const filteredByRules = filterTransactions(data, true);

        let filteredData = category === 'Whole DAO' 
            ? filteredByRules 
            : filteredByRules.filter(tx => 
                (tx['From_name'] === category || tx['From'] === category)
            );

        if (period !== 'all') {
            if (period.includes('Q')) {
                filteredData = filteredData.filter(tx => tx['Quarter'] === period);
            } else if (period.includes('_to_')) {
                const [startDate, endDate] = period.split('_to_');
                filteredData = filteredData.filter(tx => {
                    const txDate = new Date(tx['Date']);
                    return txDate >= new Date(startDate) && txDate <= new Date(endDate);
                });
            } else if (period.match(/^\d{4}$/)) {
                filteredData = filteredData.filter(tx => tx['Quarter'].startsWith(period));
            }
        }

        filteredData = filteredData.sort((a, b) => new Date(b['Date']) - new Date(a['Date']));

        const transformedData = filteredData.map(tx => ({
            Date: tx['Date'],
            From: tx['From_name'] || tx['From'],
            Through: tx['Thru'],
            To: tx['To_name'] || tx['To'],
            Amount: tx['Value'],
            Symbol: tx['Symbol'] || '',
            Category: tx['To_category'] || 'Unknown',
            'Value': tx['DOT_USD'] ? `${tx['DOT_USD']}` : '',
            'Hash': tx['Transaction Hash']
        }));

        if (transformedData.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'No data found for the specified criteria' 
            });
        }

        switch (format.toLowerCase()) {
            case 'xlsx': {
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Transactions');
                
                worksheet.columns = Object.keys(transformedData[0]).map(key => ({
                    header: key,
                    key: key,
                    width: 20
                }));

                worksheet.addRows(transformedData);

                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=${category}_${period}.xlsx`);
                
                await workbook.xlsx.write(res);
                break;
            }

            case 'csv': {
                const parser = new Parser({
                    fields: Object.keys(transformedData[0])
                });
                const csv = parser.parse(transformedData);
                
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=${category}_${period}.csv`);
                res.send(csv);
                break;
            }

            case 'json': {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename=${category}_${period}.json`);
                res.json(transformedData);
                break;
            }

            default:
                res.status(400).json({ success: false, error: 'Invalid format' });
        }

    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({ success: false, error: 'Failed to export data' });
    }
});

export { router as telegramRoutes };