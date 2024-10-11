import { navigator, parseUrl } from './modules/navigator.js';
import { drawSankey, drawCategorySankey } from './modules/sankey/sankey.js';
import { drawWalletPieChart, drawCategoryPieChart } from './modules/pie/walletPie.js';
import { initializeEventListeners, updateHideModeVisibility } from './modules/domEventHandlers.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    updateHideModeVisibility();

    navigator.setDependencies({
        drawSankey,
        drawCategorySankey,
        drawWalletPieChart,
        drawCategoryPieChart
    });

    const initialState = parseUrl();
    navigator.loadState(initialState);
    navigator.updateUrlBar(true);
});