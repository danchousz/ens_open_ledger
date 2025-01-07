import { format } from 'date-fns'

export const createMainKeyboard = (isAdmin = false) => {
    const keyboard = {
        keyboard: [
            [{ text: '📊 Latest transactions' }, { text: '📈 Historical data' }],
            [{ text: '🔍 Search address' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
        selective: false
    };

    if (isAdmin) {
        keyboard.keyboard.push([{ text: '⚙️ Admin panel' }, { text: '🔄 Reload data' }]);
    }

    return keyboard;
}

export const createLatestKeyboard = () => {
    return {
        keyboard: [
            [{ text: 'Latest: Whole DAO' }, { text: 'Latest: Ecosystem' }],
            [{ text: 'Latest: Public Goods' }, { text: 'Latest: Metagov' }],
            [{ text: '⬅️ Back to main menu' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
        selective: false
    };
};

export const createHistoricalKeyboard = () => {
    return {
        keyboard: [
            [{ text: 'Historical: Whole DAO' }, { text: 'Historical: Ecosystem' }],
            [{ text: 'Historical: Public Goods' }, { text: 'Historical: Metagov' }],
            [{ text: 'Historical: DAO Wallet' }, { text: 'Historical: Community WG' }],
            [{ text: '⬅️ Back to main menu' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
        selective: false
    };
};

export const createPeriodKeyboard = () => {
    return {
        keyboard: [
            [{ text: '📊 Specific quarter' }],
            [{ text: '📅 Specific year' }],
            [{ text: '📆 Custom date range' }],
            [{ text: '📈 All time' }],
            [{ text: '⬅️ Back to categories' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
        selective: false
    };
};

export const createQuartersKeyboard = (quarters) => {
    const formattedQuarters = quarters
        .map(q => {
            const year = q.slice(0, 4);
            const quarter = q.slice(4);
            return `${quarter} ${year}`;
        })
        .sort((a, b) => {
            const yearA = a.split(' ')[1];
            const yearB = b.split(' ')[1];
            const quarterA = a.split(' ')[0];
            const quarterB = b.split(' ')[0];
            return yearB - yearA || quarterB.localeCompare(quarterA);
        });

    const keyboard = [];
    for (let i = 0; i < formattedQuarters.length; i += 2) {
        const row = [{ text: formattedQuarters[i] }];
        if (formattedQuarters[i + 1]) {
            row.push({ text: formattedQuarters[i + 1] });
        }
        keyboard.push(row);
    }

    keyboard.push([{ text: '⬅️ Back to period selection' }]);

    return {
        keyboard,
        resize_keyboard: true,
        one_time_keyboard: false,
        selective: false
    };
};

export const createYearsKeyboard = (years) => {
    const keyboard = [];
    for (let i = 0; i < years.length; i += 2) {
        const row = [{ text: years[i] }];
        if (years[i + 1]) {
            row.push({ text: years[i + 1] });
        }
        keyboard.push(row);
    }

    keyboard.push([{ text: '⬅️ Back to period selection' }]);

    return {
        keyboard,
        resize_keyboard: true,
        one_time_keyboard: false,
        selective: false
    };
};

export const createDateSelectionKeyboard = (category) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    const months = [];
    for (let i = 0; i < 6; i++) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const monthText = format(date, 'MMMM yyyy');
        months.push([{ text: monthText }]);
    }

    return {
        keyboard: [
            ...months,
            [{ text: '📊 All-time stats' }],
            [{ text: '⬅️ Back to categories' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
        selective: false
    };
}

export const createFormatKeyboard = (isHistorical) => {
    const backToWhere = isHistorical 
                        ? 'period selection'
                        : 'search menu'
    return {
        keyboard: [
            [{ text: '📑 XLSX' }, { text: '📄 CSV' }, { text: '🔤 JSON' }],
            [{ text: `⬅️ Back to ${backToWhere}`}]
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
        selective: false
    };
};

export const createSearchKeyboard = () => {
    return {
        keyboard: [
            [{ text: '🔍 Search by Transaction Hash' }],
            [{ text: '👤 Search by Recipient' }],
            [{ text: '⬅️ Back to main menu' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
        selective: false
    };
};