import { navigator, updateChartType } from './navigator.js';
import { getSideMenuState, setSideMenuState } from './globalStates.js';
import { isDesktop } from './globalVars.js';
import { drawCategorySankey, drawSankey } from './sankey/sankey.js';
import { exportDataByPeriod, exportCustomSVG } from '../services/exportChart.js';
import { loadTransactions } from './tables/unknownTransactions.js';

export function initializeEventListeners() {
    const sideMenu = document.getElementById('sideMenu');
    const collapseButton = document.getElementById('collapseButton');
    const contextButton = document.querySelector('.context-button');
    const sankeyDiv = document.getElementById('sankeyDiagram');
    const mobileCloseButton = document.getElementById('toChartButton');

    mobileCloseButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        sideMenu.style.display = 'none';
    });

    collapseButton.addEventListener('click', () => {
        if (isDesktop) {
            const newState = !getSideMenuState();
            setSideMenuState(newState);
            if (!newState) {
                sideMenu.classList.add('collapsed');
                sideMenu.classList.remove('expanding');
                contextButton.classList.add('collapsed')
                sankeyDiv.style.marginLeft = '0.71vw';
            } else {
                sideMenu.classList.remove('collapsed');
                sideMenu.classList.add('expanding');
                contextButton.classList.remove('collapsed')
                sankeyDiv.style.marginLeft = '22.5vw';
    
                setTimeout(() => {
                    sideMenu.classList.remove('expanding');
                }, 300); 
            }

            if (!navigator.isPieChart) {
                if (navigator.currentCategory) {
                    drawCategorySankey(navigator.currentQuarter, navigator.currentCategory);
                } else {
                    if (navigator.currentQuarter !== 'big_picture') {
                        drawSankey(navigator.currentQuarter, navigator.walletFilter);
                    }
                }
            }
        }
    });

    if (isDesktop) {
        initializeDesktopModals();
    }

    initializeCommonModals();
    initializeChartTypeToggle();
    initializeHideModeToggle();
}

function initializeDesktopModals() {
    const downloadDiv = document.getElementById('downloadDiv');
    const downloadBackdrop = document.getElementById('downloadBackdrop');
    const downloadButton = document.getElementById('downloadButton');
    const identifyDiv = document.getElementById('identifyDiv');
    const identifyBackdrop = document.getElementById('identifyBackdrop');
    const identifyButton = document.getElementById('identifyButton');

    downloadButton.addEventListener('click', () => downloadDiv.style.display = 'block');
    downloadBackdrop.addEventListener('click', () => downloadDiv.style.display = 'none');

    const exportCSV = document.getElementById('exportCSV');
    const exportXLSX = document.getElementById('exportXLSX');
    const exportJSON = document.getElementById('exportJSON');
    const exportSVG = document.getElementById('exportSVG');
    const exportPNG = document.getElementById('exportPNG');

    exportCSV.addEventListener('click', () => exportDataByPeriod('csv'));
    exportXLSX.addEventListener('click', () => exportDataByPeriod('xlsx'));
    exportJSON.addEventListener('click', () => exportDataByPeriod('json'));
    exportSVG.addEventListener('click', () => exportCustomSVG('svg'));
    exportPNG.addEventListener('click', () => exportCustomSVG('png'));

    identifyButton.addEventListener('click', () => {
        identifyDiv.style.display = 'block';
        loadTransactions();
    });
    identifyBackdrop.addEventListener('click', () => identifyDiv.style.display = 'none');
}

function initializeCommonModals() {
    const recipientDetailsDiv = document.getElementById('recipientDetailsDiv');
    const recipientDetailsBackdrop = document.getElementById('recipientDetailsBackdrop');

    recipientDetailsBackdrop.addEventListener('click', () => recipientDetailsDiv.style.display = 'none');
}

function initializeChartTypeToggle() {
    const chartTypeToggle = document.getElementById('chartTypeCheckbox');
    chartTypeToggle.addEventListener('change', function() {
        navigator.isPieChart = this.checked;
        updateChartType();
    });
}

function initializeHideModeToggle() {
    const hideModeToggle = document.getElementById('hideModeCheckbox');
    if (hideModeToggle) {
        hideModeToggle.addEventListener('change', function() {
            navigator.hideMode = this.checked;
            drawSankey(navigator.currentQuarter, navigator.walletFilter);
        });
    }
}

export function updateHideModeVisibility() {
    const hideModeContainer = document.getElementById('hideModeContainer');
    const sankeyContainer = document.querySelector('.sankey-container');

    if (navigator.currentView !== 'big_picture') {
        hideModeContainer.style.display = 'none';
        sankeyContainer.style.setProperty('overflow', isDesktop ? 'hidden' : 'auto');
    } else {
        hideModeContainer.style.display = 'flex';
        sankeyContainer.style.setProperty('overflow', 'auto');
    }

    if (!isDesktop) {
        if (navigator.currentView === 'big_picture') {
            addHideModeDevice();
        } else {
            const mobileHideModeContainer = document.getElementById('mobileHideModeContainer');
            if (mobileHideModeContainer) {
                mobileHideModeContainer.remove();
            }
        }
    }
}

function addHideModeDevice() {
    if (!document.getElementById('mobileHideModeContainer')) {
        const sankeyContainer = document.querySelector('.sankey-container');
        const mobileHideModeToggle = document.createElement('div');
        mobileHideModeToggle.id = 'mobileHideModeContainer';
        mobileHideModeToggle.classList.add('field', 'field--inline');
        mobileHideModeToggle.style.display = 'flex';
        mobileHideModeToggle.style.position = 'absolute';
        mobileHideModeToggle.style.top = '7%';
        mobileHideModeToggle.style.left = '8%';
    
        mobileHideModeToggle.innerHTML = `
            <input type="checkbox" id="mobileHideModeCheckbox" class="checkbox">
            <div id="hideModeToggle" class="field__description">Hide DAO Wallet and Endowment</div>
        `;
    
        sankeyContainer.appendChild(mobileHideModeToggle);
    
        const mobileHideModeCheckbox = document.getElementById('mobileHideModeCheckbox');
        mobileHideModeCheckbox.addEventListener('change', function() {
            navigator.hideMode = this.checked;
            drawSankey(navigator.currentQuarter, navigator.walletFilter);
        });
    }
}