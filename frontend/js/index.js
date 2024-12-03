import { navigator, parseUrl } from './modules/navigator.js';
import { drawSankey, drawCategorySankey } from './modules/sankey/sankey.js';
import { drawWalletPieChart, drawCategoryPieChart } from './modules/pie/walletPie.js';
import { initializeEventListeners, updateHideModeVisibility } from './modules/domEventHandlers.js';
import { initializeSearch } from './modules/search/searchHandler.js';
import { showRecipientDetails } from './modules/tables/recipientDetails.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    initializeSearch();
    updateHideModeVisibility();

    const params = new URLSearchParams(window.location.search);
    const detailsParam = params.get('details');

    navigator.setDependencies({
        drawSankey,
        drawCategorySankey,
        drawWalletPieChart,
        drawCategoryPieChart
    });

    const initialState = parseUrl();
    navigator.loadState(initialState);
    navigator.updateUrlBar(true);

    if (detailsParam) {
        const recipient = decodeURIComponent(detailsParam);
        const isCategory = initialState.view === 'category';
        setTimeout(() => {
            showRecipientDetails(recipient, isCategory);
        }, 30);
    }
});