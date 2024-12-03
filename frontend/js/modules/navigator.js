class LedgerNavigator {
    constructor() {
        this.currentView = 'big_picture';
        this.currentQuarter = null;
        this.currentYear = null;
        this.walletFilter = null;
        this.currentCategory = null;
        this.hideMode = false;
        this.drawSankey = null;
        this.drawCategorySankey = null;
        this.drawWalletPieChart = null;
        this.drawCategoryPieChart = null;
        this.isPieChart = null;
        this.currentDetails = null;
    
        window.addEventListener('popstate', (event) => {
            if (event.state) {
                this.loadState(event.state);
            }
        });
    }

    setDependencies(dependencies) {
        this.drawSankey = dependencies.drawSankey;
        this.drawCategorySankey = dependencies.drawCategorySankey;
        this.drawWalletPieChart = dependencies.drawWalletPieChart;
        this.drawCategoryPieChart = dependencies.drawCategoryPieChart;
    }

    updateUrlBar(initialLoad = false) {
        let path = '/';
        const params = new URLSearchParams();
    
        if (this.currentYear) {
            path += `year/${this.currentYear}`;
            if (this.walletFilter) {
                path += `/${encodeURIComponent(this.walletFilter)}`;
            } else if (this.currentView === 'category') {
                path += `/category/${encodeURIComponent(this.currentCategory)}`;
            }
        } else if (this.currentQuarter) {
            path += `quarter/${this.currentQuarter}`;
            if (this.walletFilter) {
                path += `/${encodeURIComponent(this.walletFilter)}`;
            } else if (this.currentView === 'category') {
                path += `/category/${encodeURIComponent(this.currentCategory)}`;
            }
        }
    
        // Add details to URL if present
        if (this.currentDetails) {
            params.set('details', encodeURIComponent(this.currentDetails));
        }
    
        const url = path + (params.toString() ? `?${params.toString()}` : '');
        if (!initialLoad) {
            history.pushState(this.getState(), '', url);
        } else {
            history.replaceState(this.getState(), '', url);
        }
    }

    getState() {
        const state = {
            view: this.currentView,
            quarter: this.currentQuarter,
            year: this.currentYear,
            wallet: this.walletFilter,
            category: this.currentCategory,
            hideMode: this.hideMode,
            details: this.currentDetails
        };
        return state;
    }
    
    loadState(state) {
        this.currentView = state.view;
        if (state.year) {
            this.currentYear = state.year;
            this.currentQuarter = null;
        } else {
            this.currentQuarter = state.quarter;
            this.currentYear = null;
        }
        this.walletFilter = state.wallet;
        this.currentCategory = state.category;
        this.hideMode = state.hideMode;
        this.currentDetails = state.details;
        
        this.updateDiagram();
        updateContextButton();
    }
    
    // Add or modify these methods
    setRecipientDetails(recipient) {
        this.currentDetails = recipient;
        this.updateUrlBar();
    }
    
    clearRecipientDetails() {
        this.currentDetails = null;
        this.updateUrlBar();
    }
      
    updateDiagram() {
        if (this.currentView === 'category') {
            if (this.currentYear) {
                this.drawCategorySankey(this.currentYear, this.currentCategory, true);
            } else {
                this.drawCategorySankey(this.currentQuarter, this.currentCategory);
            }
        } else {
            const period = this.currentView === 'big_picture' ? 'big_picture' : 
                           this.currentYear || this.currentQuarter;
            this.drawSankey(period, this.walletFilter);
        }
    }

    setBigPicture() {
        this.currentView = 'big_picture';
        this.currentQuarter = null;
        this.currentYear = null;
        this.walletFilter = null;
        this.currentCategory = null;
        this.updateDiagram();
        this.updateUrlBar();
    }
      
    setQuarter(quarter, isPlotlyClick) {
        this.currentView = 'quarter';
        this.currentQuarter = quarter;
        this.currentYear = null;
        this.currentCategory = null;
        this.walletFilter = null;
        this.isPieChart = false;
        this.updateUrlBar();
        if (!isPlotlyClick) {
            this.updateDiagram();
        }
        updateChartTypeToggleVisibility();
    }

    setYear(year, isPlotlyClick) {
        this.currentView = 'year';
        this.currentYear = year;
        this.currentQuarter = null;
        this.currentCategory = null;
        this.walletFilter = null;
        this.isPieChart = false;
        this.updateUrlBar();
        if (!isPlotlyClick) {
            this.updateDiagram();
        }
        updateChartTypeToggleVisibility();
    }
      
    setWalletFilter(wallet) {
        this.currentView = 'wallet';
        this.walletFilter = wallet;
        this.currentCategory = null;
        this.updateDiagram();
        this.updateUrlBar();
    }

    setCategoryView(period, category) {
        this.currentView = 'category';
        if (period.includes('Q')) {
            this.currentQuarter = period;
            this.currentYear = null;
        } else {
            this.currentYear = period;
            this.currentQuarter = null;
        }
        this.currentCategory = category;
        this.walletFilter = null;
        this.updateUrlBar();
        this.updateDiagram();
        updateContextButton();
    }
}

export function parseUrl() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    const params = new URLSearchParams(window.location.search);
    
    let view = 'big_picture';
    let quarter = null;
    let year = null;
    let wallet = null;
    let category = null;
    let details = params.get('details') ? decodeURIComponent(params.get('details')) : null;
    
    if (parts[0] === 'quarter') {
        view = 'quarter';
        quarter = parts[1];
        if (parts[2] === 'category') {
            view = 'category';
            category = decodeURIComponent(parts[3]);
        } else if (parts.length >= 3) {
            view = 'wallet';
            wallet = decodeURIComponent(parts[2]);
        }
    } else if (parts[0] === 'year') {
        view = 'year';
        year = parts[1];
        if (parts[2] === 'category') {
            view = 'category';
            category = decodeURIComponent(parts[3]);
        } else if (parts.length >= 3) {
            view = 'wallet';
            wallet = decodeURIComponent(parts[2]);
        }
    }
    
    return { view, quarter, year, wallet, category, details };
}

import { exitPieChart } from './pie/walletPie.js';

export function updateContextButton() {
    const contextButtonContainer = document.getElementById('contextButtonContainer');
    const contextButton = document.getElementById('contextButton');
    const contextButtonText = document.getElementById('contextButtonText');
    const chartTypeToggle = document.getElementById('chartTypeCheckbox');
    
    if (navigator.currentView === 'big_picture') {
        contextButtonContainer.style.display = 'none';
    } else {
        contextButtonContainer.style.display = 'block';
        
        if (navigator.currentView === 'wallet' || navigator.currentView === 'category') {
            contextButtonText.textContent = `Back to ${navigator.currentYear ? 'Year' : 'Quarter'} ${navigator.currentYear || navigator.currentQuarter}`;
            contextButton.onclick = () => {
                navigator.isPieChart = false;
                chartTypeToggle.checked = false;
                navigator.currentYear ? navigator.setYear(navigator.currentYear) : navigator.setQuarter(navigator.currentQuarter);
                exitPieChart();
            };
        } else {
            contextButtonText.textContent = 'Full View';
            contextButton.onclick = () => {
                navigator.isPieChart = false;
                chartTypeToggle.checked = false;
                navigator.setBigPicture();
                exitPieChart();
            };
        }
    }
    updateChartTypeToggleVisibility();
}

export function updateChartTypeToggleVisibility() {
    const chartTypeToggle = document.getElementById('chartTypeToggle');
    if (navigator.currentCategory || navigator.walletFilter) {
        chartTypeToggle.style.display = 'flex';
    } else {
        chartTypeToggle.style.display = 'none';
    }
}

export function updateChartType() {
    if (navigator.currentCategory) {
        if (navigator.isPieChart) {
            navigator.drawCategoryPieChart(navigator.currentQuarter || navigator.currentYear, navigator.currentCategory, !!navigator.currentYear);
        } else {
            exitPieChart();
            navigator.drawCategorySankey(navigator.currentQuarter || navigator.currentYear, navigator.currentCategory, !!navigator.currentYear);
        }
    } else if (navigator.walletFilter) {
        if (navigator.isPieChart) {
            navigator.drawWalletPieChart(navigator.currentQuarter || navigator.currentYear, navigator.walletFilter, !!navigator.currentYear);
        } else {
            exitPieChart();
            navigator.drawSankey(navigator.currentQuarter || navigator.currentYear, navigator.walletFilter);
        }
    } else {
        exitPieChart();
        navigator.drawSankey(navigator.currentQuarter || navigator.currentYear, null);
    }
    updateChartTypeToggleVisibility();
}

export const navigator = new LedgerNavigator();