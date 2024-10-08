document.addEventListener('DOMContentLoaded', () => {

    let hideMode = false;
    let currentWalletFilter = null;
    let zoneSendersList = [];
    let qtrSendersList = []
    let nodeName;
    let currentQuarter = 'big_picture';
    let specialWallets = ['Ecosystem', 'Public Goods', 'Metagov', 'Community WG', 'Providers'];
    let registrars = ['Old Registrar', 'New Registrar'];
    let daoWallet = ['DAO Wallet'];
    let openBanners = new Set();
    let isPieChart = false;

    const colorMap = {
        'USDC': '#5294e2',
        'ETH': '#b97cf3',
        'ENS': '#5ac8fa'
    };

    const sankeyContainer = document.querySelector('.sankey-container');
    const sankeyDiv = document.getElementById('sankeyDiagram');
    const isDesktop = window.innerWidth >= 768;
    const hideModeContainer = document.getElementById('hideModeContainer');

    const sideMenu = document.getElementById('sideMenu');
    const collapseButton = document.getElementById('collapseButton');
    const contextButton = document.querySelector('.context-button');
    let isSideMenuExpanded = true;

    const mobileCloseButton = document.getElementById('toChartButton');

    mobileCloseButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        sideMenu.style.display = 'none';
    });

    collapseButton.addEventListener('click', () => {
        if (isDesktop) {
            if (isSideMenuExpanded) {
                sideMenu.classList.add('collapsed');
                sideMenu.classList.remove('expanding');
                contextButton.classList.add('collapsed')
                sankeyDiv.style.marginLeft = '0.71vw';
                isSideMenuExpanded = false;
            } else {
                sideMenu.classList.remove('collapsed');
                sideMenu.classList.add('expanding');
                contextButton.classList.remove('collapsed')
                sankeyDiv.style.marginLeft = '22.5vw';
                isSideMenuExpanded = true;

                setTimeout(() => {
                    sideMenu.classList.remove('expanding');
                }, 300); 
            }
            
            if (navigator.currentCategory) {
                drawCategorySankey(navigator.currentQuarter, navigator.currentCategory);
            } else {
                if (currentQuarter !== 'big_picture') {
                drawSankey(currentQuarter, currentWalletFilter, hideMode);
                }
            }
        }
    });

    // Desktop Modals

    if (isDesktop) {

        // Download Modal

        const downloadDiv = document.getElementById('downloadDiv');
        const downloadBackdrop = document.getElementById('downloadBackdrop');
        const downloadButton = document.getElementById('downloadButton');

        downloadButton.addEventListener('click', function() {
            downloadDiv.style.display = 'block';
        });

        downloadBackdrop.addEventListener('click', function() {
            downloadDiv.style.display = 'none';
        });

        const exportCSV = document.getElementById('exportCSV');
        const exportXLSX = document.getElementById('exportXLSX');
        const exportJSON = document.getElementById('exportJSON');
        const exportSVG = document.getElementById('exportSVG');
        const exportPNG = document.getElementById('exportPNG');

        exportCSV.addEventListener('click', () => 
            exportData('csv')
        );
        exportXLSX.addEventListener('click', () => 
            exportData('xlsx')
        );
        exportJSON.addEventListener('click', () => 
            exportData('json')
        );
        exportSVG.addEventListener('click', () => {
            exportCustomSVG('svg');
        });
        exportPNG.addEventListener('click', () => {
            exportCustomSVG('png');
        });

        // Identify Modal

        const identifyDiv = document.getElementById('identifyDiv');
        const identifyBackdrop = document.getElementById('identifyBackdrop');
        const identifyButton = document.getElementById('identifyButton');

        identifyButton.addEventListener('click', function() {
            identifyDiv.style.display = 'block';
            loadTransactions();
        });
        identifyBackdrop.addEventListener('click', function() {
            identifyDiv.style.display = 'none';
        });

        const hideModeToggle = document.getElementById('hideModeCheckbox');

        hideModeToggle.addEventListener('change', function() {
            hideMode = this.checked;
            drawSankey(currentQuarter, currentWalletFilter, hideMode);
        });
    };
    
    // Common Modals

        // Recipient Details Modal

        const recipientDetailsDiv = document.getElementById('recipientDetailsDiv');
        const recipientDetailsBackdrop = document.getElementById('recipientDetailsBackdrop');

        recipientDetailsBackdrop.addEventListener('click', function() {
            recipientDetailsDiv.style.display = 'none';
        });

    const chartTypeToggle = document.getElementById('chartTypeCheckbox');

    chartTypeToggle.addEventListener('change', function() {
        isPieChart = this.checked;
        updateChart();
    });

    function getEtherscanLink(hash, address) {
        if (hash) {
            return `https://etherscan.io/tx/${hash}`
        } else {
            return `https://etherscan.io/address/${address}`
        }
    }

    function formatValue(value, min, max, abbr) {
        if (abbr) {
            if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'k';
            } else {
                return value.toString();
            }
        } else {
            return parseFloat(value).toLocaleString('en-US', {
                minimumFractionDigits: min,
                maximumFractionDigits: max
            });
        }
    }    

    function groupDataByField(transactions, field) {
        const groupedData = {};
        transactions.forEach(tx => {
            const key = tx[field];
            if (!groupedData[key]) {
                groupedData[key] = 0;
            }
            groupedData[key] += parseFloat(tx.DOT_USD);
        });
        return groupedData;
    }

    function getMonthRange(quarterIndex) {
        switch(parseInt(quarterIndex)) {
            case 1: return 'Jan-Mar';
            case 2: return 'Apr-Jun';
            case 3: return 'Jul-Sep';
            case 4: return 'Oct-Dec';
            default: return '';
        }
    }




    function addHideModeDevice() {
        if (!document.getElementById('mobileHideModeContainer')) {
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
                hideMode = this.checked;
                drawSankey(currentQuarter, currentWalletFilter, hideMode);
            });
        }
    }

    // Navigator and stuff for handling navigation

    class LedgerNavigator {
        constructor() {
            this.currentView = 'big_picture';
            this.currentQuarter = null;
            this.currentYear = null;
            this.walletFilter = null;
            this.hideMode = false;
        
            window.addEventListener('popstate', (event) => {
                if (event.state) {
                    this.loadState(event.state);
                }
            });
        }
    
        updateUrlBar(initialLoad = false) {
            let path = '/';
            const params = new URLSearchParams();
    
            if (this.currentView === 'quarter' || this.currentView === 'wallet') {
                path += `quarter/${this.currentQuarter}`;
                if (this.walletFilter) {
                    path += `/${encodeURIComponent(this.walletFilter)}`;
                }
            } else if (this.currentView === 'year') {
                path += `year/${this.currentYear}`;
            } else if (this.currentView === 'category') {
                path += `category/${this.currentQuarter}/${encodeURIComponent(this.currentCategory)}`;
            }
    
            const url = path + (params.toString() ? `?${params.toString()}` : '');
            if (!initialLoad) {
                history.pushState(this.getState(), '', url);
            } else {
                history.replaceState(this.getState(), '', url);
            }
        }
    
        getState() {
            return {
                view: this.currentView,
                quarter: this.currentQuarter,
                year: this.currentYear,
                wallet: this.walletFilter,
                category: this.currentCategory,
                hideMode: this.hideMode
            };
        }
        
        loadState(state) {
            this.currentView = state.view;
            this.currentQuarter = state.quarter;
            this.currentYear = state.year;
            this.walletFilter = state.wallet;
            this.currentCategory = state.category;
            this.hideMode = state.hideMode;
          
            this.updateDiagram();
            updateContextButton();
        }
          
        updateDiagram() {
            if (this.currentView === 'category') {
                drawCategorySankey(this.currentQuarter, this.currentCategory);
            } else {
                drawSankey(
                    this.currentView === 'big_picture' ? 'big_picture' : 
                    this.currentView === 'year' ? this.currentYear :
                    this.currentQuarter,
                    this.walletFilter,
                    this.hideMode
                );
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
            isPieChart = false;
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
            isPieChart = false;
            this.updateUrlBar();
            if (!isPlotlyClick) {
                this.updateDiagram();
            }
            updateChartTypeToggleVisibility();
        }
          
        setWalletFilter(wallet) {
            if (this.currentQuarter || this.currentYear) {
                this.currentView = 'wallet';
                this.walletFilter = wallet;
                this.currentCategory = null;
                this.updateDiagram();
                this.updateUrlBar();
            } else {
                console.error('Cannot set wallet filter without a quarter or year selected');
            }
        }
    
        setCategoryView(quarter, category) {
            this.currentView = 'category';
            this.currentQuarter = quarter;
            this.currentCategory = category;
            this.currentYear = null;
            this.walletFilter = null;
            this.updateUrlBar();
            this.updateDiagram();
            updateContextButton();
        }
    }

    function parseUrl() {
        const path = window.location.pathname;
        const parts = path.split('/').filter(Boolean);
        
        let view = 'big_picture';
        let quarter = null;
        let year = null;
        let wallet = null;
        let category = null;
        
        if (parts[0] === 'quarter') {
            view = 'quarter';
            quarter = parts[1];
            if (parts.length >= 3) {
                view = 'wallet';
                wallet = decodeURIComponent(parts[2]);
            }
        } else if (parts[0] === 'year') {
            view = 'year';
            year = parts[1];
        } else if (parts[0] === 'category') {
            view = 'category';
            quarter = parts[1];
            category = decodeURIComponent(parts[2]);
        }
        return { view, quarter, year, wallet, category };
    }

    function updateContextButton() {
        const contextButtonContainer = document.getElementById('contextButtonContainer');
        const contextButton = document.getElementById('contextButton');
        const contextButtonText = document.getElementById('contextButtonText');
        
        if (navigator.currentView === 'big_picture') {
            contextButtonContainer.style.display = 'none';
        } else {
            contextButtonContainer.style.display = 'block';
            
            if (navigator.currentView === 'wallet' || navigator.currentView === 'category') {
                contextButtonText.textContent = `Back to ${navigator.currentYear ? 'Year' : 'Quarter'} ${navigator.currentYear || navigator.currentQuarter}`;
                contextButton.onclick = () => {
                    isPieChart = false;
                    navigator.currentYear ? navigator.setYear(navigator.currentYear) : navigator.setQuarter(navigator.currentQuarter);
                };
            } else {
                contextButtonText.textContent = 'Full View';
                contextButton.onclick = () => {
                    isPieChart = false;
                    navigator.setBigPicture();
                };
            }
        }
        updateChartTypeToggleVisibility();
    }

    function getCurrentView() {
        if (currentWalletFilter) {
            return 'wallet';
        } else if (currentQuarter === 'big_picture') {
            return 'big_picture';
        } else {
            return 'quarter';
        }
    } // TO DELETE

    function getCurrentFilter() {
        if (currentWalletFilter) {
            return currentWalletFilter;
        } else if (currentQuarter === 'big_picture') {
            return null;
        } else {
            return currentQuarter;
        }
    }
    
    // Functions to manage unidentified txs and update the table
    
    function loadTransactions() {
        fetch('/unknown_contractors')
        .then(response => response.json())
        .then(data => {
            const transactionsTable = document.getElementById('transactionsTable').getElementsByTagName('tbody')[0];
            transactionsTable.innerHTML = '';
            data.forEach(tx => {
                const row = transactionsTable.insertRow();
                const isAcquainted = tx['Acquainted?'] === 1;
                row.innerHTML = `
                    <td>${tx.Date}</td>
                    <td><a href="${getEtherscanLink(tx['Transaction Hash'])}" target="_blank">${tx['Transaction Hash'].substring(0, 6)}...</a></td>
                    <td>
                        <span style="color: ${colorMap[tx.Symbol]}; font-weight: bold;">
                            ${formatValue(-tx.Value, 0, 2)} ${tx.Symbol}
                        </span>
                    </td>
                    <td>${tx['From_name']}</td>
                    <td>${tx.To}</td>
                    <td>${isAcquainted ? tx.To_name : '<input type="text" class="name-input">'}</td>
                    <td>${isAcquainted ? tx.To_category : '<input type="text" class="category-input">'}</td>
                    <td>
                        <div class="button--submit">Submit</div>
                        <span class="checkmark" style="display: none;">✓</span>
                    </td>
                `;

                const submitButton = row.querySelector('.button--submit');
                const checkmark = row.querySelector('.checkmark');
                submitButton.addEventListener('click', function() {
                    const nameInput = row.querySelector('.name-input');
                    const categoryInput = row.querySelector('.category-input');
                    const name = isAcquainted ? tx.To_name : nameInput.value;
                    const category = isAcquainted ? tx.To_category : categoryInput.value;

                    saveTransaction({
                        Hash: tx['Transaction Hash'],
                        From: tx['From_name'],
                        Amount: -tx.Value,
                        Address: tx.To,
                        Name: name,
                        Category: category
                    });

                    checkmark.style.display = 'inline';
                    submitButton.style.display = 'none';
                });
            });
        })
        .catch(error => console.error('Error loading transactions:', error));
    }
    
    function saveTransaction(transactionData) {
        fetch('/save_transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(transactionData),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
    }
        
    
    function drawCategorySankey(quarter, category) {

        sankeyContainer.scrollTo(0, 0);
        window.scrollTo(0, 0);
        
        const getWidth = window.innerWidth;
        const getHeight = window.innerHeight;
    
        const heightCalibration = getHeight / 820;
        const widthCalibration = getWidth / 1440;

        updateChartTypeToggleVisibility();

        if (isPieChart) {
            drawCategoryPieChart(quarter, category);
            return;
          }
        fetch(`/category-sankey-data/${encodeURIComponent(category)}/${quarter}`)
          .then(response => response.json())
          .then(({ data, layout }) => {
            const config = {
              displayModeBar: false,
              responsive: true
            };
      
            Plotly.newPlot(sankeyDiv, data, {
              ...layout,
              width: isDesktop ? (isSideMenuExpanded ? (0.77*getWidth) : getWidth) : 1440,
              height: getHeight,
              font: {
                size: 14 * widthCalibration,
                family: "satoshi"
              },
              margin: { l: 200 * widthCalibration, r: 200 * widthCalibration, b: 100 * heightCalibration, t: 150 * heightCalibration },
            }, config).then(() => {
              updateNodeLabels();
              
              sankeyDiv.on('plotly_click', function(eventData) {
                const clickedPoint = eventData.points[0];


                const recipientName = clickedPoint.label === category
                ? clickedPoint.label
                : clickedPoint.label.split(' - ')[1];
                
                if (clickedPoint.childrenNodes) {
                    if (recipientName === category) {
                        showRecipientDetails(recipientName, true);
                    } else {
                        showRecipientDetails(recipientName, false);
                    }
                } else {
                const txDetails = clickedPoint.customdata;
                if (txDetails) {
                    const bannerId = `${category}-${txDetails.to}-${quarter}`;
                    
                    if (openBanners.has(bannerId)) {
                    shakeBanner(bannerId);
                    } else {
                    const flowInfo = `${txDetails.date}: <b>${txDetails.from}</b> sent ${txDetails.value} ${txDetails.symbol} (${txDetails.usd} USD) to <b>${txDetails.to}</b>`;
                    const etherscanUrl = txDetails.receipt ? getEtherscanLink(txDetails.receipt) : null;
                    createFlowBanner(flowInfo, etherscanUrl, bannerId);
                    }
                }
                }
              });
            });
          })
          .catch(error => console.error('Error:', error));
    }
    
    // Export data functionality 

    function generateFileName(format, recipient) {
        let fileName = '';
        if (recipient) {
            fileName += `${recipient}.${format}`;
        } else {
            if (navigator.currentView === 'big_picture') {
                fileName = `big_picture_ledger.${format}`;
            } else if (navigator.currentView === 'quarter') {
                fileName = `${navigator.currentQuarter}_ledger.${format}`;
            } else if (navigator.currentView === 'wallet') {
                const formattedWallet = navigator.walletFilter.replace(/ /g, '_');
                fileName = `${formattedWallet}_${navigator.currentQuarter}_ledger.${format}`;
            }
        }
        return fileName;
    }

    function saveAsCSV(data, recipient) {
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => row[header]).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const fileName = generateFileName('csv', recipient);
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    
    function saveAsXLSX(data, recipient) {
        const fileName = generateFileName('xlsx', recipient);
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, fileName);
    }
    
    function saveAsJSON(data, recipient) {
        const fileName = generateFileName('json', recipient);
        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    function exportData(format) {
        const currentView = getCurrentView();
        const currentFilter = getCurrentFilter();
    
        fetch(`/export-data?view=${currentView}&filter=${currentFilter}&quarter=${currentQuarter}`)
            .then(response => response.json())
            .then(data => {
                const filteredData = data
                    .filter(row => row.From_name !== 'Plchld' && row.To_name !== 'Plchld')
                    .sort((a, b) => new Date(a.Date) - new Date(b.Date));
    
                const formattedData = filteredData.map(row => ({
                    'Transaction Hash': row['Transaction Hash'],
                    'Date': row.Date,
                    'Quarter': row.Quarter,
                    'From': row.From_name,
                    'To': row.To_name,
                    'Category': row.To_category,
                    'Amount': row.Value,
                    'Asset': row.Symbol,
                    'Value': row.DOT_USD
                }));
                
                switch (format) {
                    case 'csv':
                        saveAsCSV(formattedData, false);
                        break;
                    case 'xlsx':
                        saveAsXLSX(formattedData, false);
                        break;
                    case 'json':
                        saveAsJSON(formattedData, false);
                        break;
                }
            });
    }
    
    
    function saveTableAs(format, transactions, recipientName) {
        const tableData = transactions.map(tx => ({
            'Transaction Hash': tx['Transaction Hash'],
            'Date': tx.Date,
            'Quarter': tx.Quarter,
            'From': tx.From_name,
            'To': tx.To_name,
            'Category': tx.To_category,
            'Amount': tx.Value,
            'Asset': tx.Symbol,
            'Value': tx.DOT_USD
        }));
    
        switch (format) {
            case 'xlsx':
                saveAsXLSX(tableData, recipientName);
                break;
            case 'csv':
                saveAsCSV(tableData, recipientName);
                break;
            case 'json':
                saveAsJSON(tableData, recipientName);
                break;
        }
    }

    function exportCustomSVG(format = 'svg', chartElement) {
        const sankeyDiv = document.getElementById('sankeyDiagram');
        const targetElement = chartElement || sankeyDiv;
        const plotSVG = targetElement.getElementsByTagName('svg')[0];
        const gd = targetElement._fullLayout;
    
        const shapes = navigator.currentView === 'big_picture' ? gd.shapes : [];
        const annotations = navigator.currentView === 'big_picture' ? gd.annotations : [];
    
        const svgCopy = plotSVG.cloneNode(true);
    
        const nodeLabels = svgCopy.querySelectorAll('.node-label');
        nodeLabels.forEach(label => {
            label.style.fontFamily = 'Satoshi, sans-serif';
        });
    
        let width = parseFloat(svgCopy.getAttribute('width'));
        let height = parseFloat(svgCopy.getAttribute('height'));
    
        const isFromCategoryModal = chartElement && chartElement.id === 'categorySankeyChart';
    
        if (!isFromCategoryModal && navigator.currentView === 'big_picture') {
            const maxHeight = 2000;
            if (height > maxHeight) {
                height = maxHeight;
                svgCopy.setAttribute('height', height);
                svgCopy.setAttribute('viewBox', `0 0 ${width} ${height}`);
                
                const clipPath = svgCopy.querySelector('clipPath');
                if (clipPath) {
                    const rect = clipPath.querySelector('rect');
                    if (rect) {
                        rect.setAttribute('height', height);
                    }
                }
            }
        }
    
        const overlayGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        overlayGroup.setAttribute('class', 'overlay-group');
    
        shapes.forEach((shape, index) => {
            const shapeElem = createSVGShape(shape, width, height);
            if (shapeElem) {
                overlayGroup.appendChild(shapeElem);
            }
        });
    
        annotations.forEach((annotation, index) => {
            const annotationElem = createSVGAnnotation(annotation, width, height);
            if (annotationElem) {
                overlayGroup.appendChild(annotationElem);
            }
        });
    
        svgCopy.appendChild(overlayGroup);
    
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgCopy);
        
        svgString = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
                    '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
                    svgString;
    
        if (format === 'svg') {
            const blob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
            const url = URL.createObjectURL(blob);
    
            let fileName;
            if (isFromCategoryModal) {
                const title = document.getElementById('categorySankeyTitle').textContent;
                fileName = `${title.replace(' - ', '_')}.svg`;
            } else {
                fileName = generateFileName('svg');
            }
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute("download", fileName);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
    
            URL.revokeObjectURL(url);
        } else if (format === 'png') {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
    
                ctx.drawImage(img, 0, 0);
    
                canvas.toBlob(function(blob) {
                    const url = URL.createObjectURL(blob);
    
                    let fileName;
                    if (isFromCategoryModal) {
                        const title = document.getElementById('categorySankeyTitle').textContent;
                        fileName = `${title.replace(' - ', '_')}.png`;
                    } else {
                        fileName = generateFileName('png');
                    }
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute("download", fileName);
                    
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
    
                    URL.revokeObjectURL(url);
                }, 'image/png');
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
        }
    
        const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Satoshi:wght@400;700&display=swap');
            text, .node-label {
                font-family: 'Satoshi', sans-serif !important;
            }
        `;
        svgCopy.insertBefore(style, svgCopy.firstChild);
    }

    function createSVGShape(shape, width, height) {        const svgns = "http://www.w3.org/2000/svg";
        let elem;
    
        try {
            if (shape.type === 'line') {
                elem = document.createElementNS(svgns, 'line');
                
                if (shape.x0 === shape.x1) {
                    elem.setAttribute('x1', shape.x0 * width);
                    elem.setAttribute('y1', 0);
                    elem.setAttribute('x2', shape.x1 * width);
                    elem.setAttribute('y2', height);
                } 
                else if (shape.y0 === shape.y1) {
                    elem.setAttribute('x1', 0);
                    elem.setAttribute('x2', width);
                    elem.setAttribute('y1', 0.05 * height);
                    elem.setAttribute('y2', 0.05 * height);
                }
            } else {
                elem = document.createElementNS(svgns, 'rect');
                elem.setAttribute('x', shape.x0 * width);
                elem.setAttribute('y', shape.y0 * height);
                elem.setAttribute('width', (shape.x1 - shape.x0) * width);
                elem.setAttribute('height', (shape.y1 - shape.y0) * height);
            }
    
            if (elem) {
                elem.setAttribute('fill', shape.fillcolor || 'none');
                elem.setAttribute('stroke', shape.line.color || 'black');
                elem.setAttribute('stroke-width', shape.line.width || 1);
                elem.setAttribute('vector-effect', 'non-scaling-stroke');
            }
        } catch (error) {
            console.error('Error creating shape:', error);
            return null;
        }
    
        return elem;
    }
    
    function createSVGAnnotation(annotation, width, height) {        const svgns = "http://www.w3.org/2000/svg";
        const g = document.createElementNS(svgns, 'g');
    
        try {
            let x;
            let y;
                        
            const text = document.createElementNS(svgns, 'text');
            text.textContent = annotation.text;

            if (text.textContent.startsWith('2')) {
                y = 0.01 * height;
            } else {
                y = 0.03 * height;
            }
            x = (annotation.x - 0.0075) * width;
            
            text.setAttribute('x', x);
            text.setAttribute('y', y);
            text.setAttribute('text-anchor', annotation.xanchor);
            text.setAttribute('dominant-baseline', 'hanging');
            text.setAttribute('font-family', 'satoshi');
            text.setAttribute('font-size', `${annotation.font.size}px`);
            text.setAttribute('fill', annotation.font.color);
    
            if (annotation.textangle) {
                text.setAttribute('transform', `rotate(${annotation.textangle}, ${x}, ${y})`);
            }
    
            g.appendChild(text);
    
        } catch (error) {
            console.error('Error creating annotation:', error);
            return null;
        }
    
        return g;
    }

    // Detailed statistics

    function showRecipientDetails(recipientName, isCategory) {
        const specialWallets = ['Ecosystem', 'Public Goods', 'Metagov', 'Community WG', 'Providers'];
        const isSpecialWallet = specialWallets.includes(recipientName);
    
        if (recipientName === 'DAO Wallet') {
            return;
        }
    
        fetch(`/recipient_details/${encodeURIComponent(recipientName)}?isCategory=${isCategory}&isSpecialWallet=${isSpecialWallet}`)
        .then(response => response.json())
        .then(data => {
            if (!data.transactions || data.transactions.length === 0) {
                return;
            }

            data.transactions.sort((a, b) => new Date(b.Date) - new Date(a.Date));

            const tableHeaders = isSpecialWallet
                ? ['Date', 'Amount', 'USD Value', 'Category', 'Address', 'To', 'TX']
                : (isCategory
                    ? ['Date', 'Amount', 'USD Value', 'From', 'Address', 'Counterparty', 'TX']
                    : ['Date', 'Amount', 'USD Value', 'From', 'Address', 'Item', 'TX']);

            const tableRows = data.transactions.map(tx => {
                const txLink = `<a href="${getEtherscanLink(tx['Transaction Hash'])}" target="_blank" style="color: #2f7cff; text-decoration: none;">${tx['Transaction Hash'].substring(0, 6)}...</a>`;

                const addressLink = isSpecialWallet
                    ? `<a href="${getEtherscanLink(null, tx['To'])}" target="_blank" style="color: #2f7cff; text-decoration: none;">${isDesktop ? tx['To'] : tx['To'].substring(0, 6)}</a>`
                    : `<a href="${getEtherscanLink(null, tx['To'])}" target="_blank" style="color: #2f7cff; text-decoration: none;">${isDesktop ? tx['To'] : tx['To'].substring(0, 6)}</a>`;

                const formattedValue = formatValue(tx.Value, 0, 1);
                const roundedDOT_USD = formatValue(tx.DOT_USD, 0, 0);
                const amountColor = colorMap[tx.Symbol] || 'black';

                let counterpartyCell;
                if (isSpecialWallet) {
                    counterpartyCell = `
                        <div style="display: flex; align-items: center;">
                            <img src="/api/placeholder/32/32" alt="${tx.To_name}" class="avatar-${tx.To_name}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 10px;">
                            <span>${tx.To_name}</span>
                        </div>
                    `;
                } else if (isCategory) {
                    counterpartyCell = `
                        <div style="display: flex; align-items: center;">
                            <img src="/api/placeholder/32/32" alt="${tx.To_name}" class="avatar-${tx.To_name}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 10px;">
                            <span>${tx.To_name}</span>
                        </div>
                    `;
                } else {
                    counterpartyCell = tx.To_category;
                }

                return `<tr style="text-align: center; font-family: satoshi; font-size: 1.14vw;">
                    <td>${tx.Date}</td>
                    <td>
                        <span style="color: ${amountColor}; font-weight: bold;">${formattedValue} ${tx.Symbol}</span>
                    </td>
                    <td>${roundedDOT_USD} $</td>
                    <td>${isSpecialWallet ? tx.To_category : tx.From_name}</td>
                    <td>${addressLink}</td>
                    <td>${counterpartyCell}</td>
                    <td>${txLink}</td>
                </tr>`;
            }).join('');
    
            const summaryStyle = isDesktop
                ? 'text-align: center; font-size: 1.14vw; background-color: white; padding: 1.07vw; border-radius: 0.71vw; margin-bottom: 1.42vw; font-family: satoshi;'
                : 'text-align: center; font-size: 2vw; background-color: white; padding: 1.07vw; border-radius: 0.71vw; margin-bottom: 2.5vw; font-family: satoshi;';

            const summaryHtml = `
                <p style="${summaryStyle}">
                    ${isSpecialWallet ? `Special wallet '${recipientName}' sent` : (isCategory ? `Category '${recipientName}' received` : `Counterparty '${recipientName}' received`)} 
                    <span style="color: ${colorMap['ETH']}">${data.summary.ETH} ETH</span>, 
                    <span style="color: ${colorMap['USDC']}">${data.summary.USDC} USDC</span> and 
                    <span style="color: ${colorMap['ENS']}">${data.summary.ENS} ENS</span>, 
                    which is the equivalent of <strong>${data.summary.total_usd} USD</strong> at the moment of transactions.
                </p>
            `;

            const tableHeaderStyle = isDesktop
                ? 'border: 0.071vw solid #ddd; padding: 0.857vw; text-align: center; background-color: #f2f2f2; font-size: 1.14vw; font-family: satoshi;'
                : 'border: 0.071vw solid #ddd; padding: 0.857vw; text-align: center; background-color: #f2f2f2; font-size: 2vw; font-family: satoshi;';

            const tableRowsStyle = isDesktop
                ? 'border: 0.071vw solid #ddd; padding: 0.857vw;'
                : 'border: 0.071vw solid #ddd; padding: 0.857vw; font-size: 2vw';

            const tableHtml = `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            ${tableHeaders.map(header => `<th style="${tableHeaderStyle}">${header}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows.replace(/<td/g, `<td style="${tableRowsStyle}"`)}
                    </tbody>
                </table>
            `;

            const quarterData = groupDataByField(data.transactions, 'Quarter');
            let counterpartiesData;
            let senderData;

            if (!isSpecialWallet) {
                counterpartiesData = isCategory
                    ? groupDataByField(data.transactions, 'To_name')
                    : groupDataByField(data.transactions, 'To_category');
                senderData = groupDataByField(data.transactions, 'From_name');
            } else {
                counterpartiesData = groupDataByField(data.transactions, 'To_name');
            }

            const chartsStyle = isDesktop
                ? 'background-color: white; padding: 1.42vw; border-radius: 0.71vw; margin-bottom: 1.42vw;'
                : 'background-color: white; border-radius: 0.71vw; margin-bottom: 2.5vw;';

            const chartsHeaderStyle = isDesktop
                ? 'text-align: center; margin-bottom: 1.42vw; font-size: 1.28vw; font-family: satoshi;'
                : 'text-align: center; margin-bottom: 1.42vw; font-size: 2vw; font-family: satoshi;';

                const chartsHtml = `
                <div style="${chartsStyle}">
                    <div style="${chartsHeaderStyle}">Distribution by</div>
                    <div style="display: flex; justify-content: space-between; width: 100%; font-size: 1.07vw; font-family: satoshi">
                        ${createPieChartHtml('Quarter', quarterData, isSpecialWallet)}
                        <div style="width: 0.071vw; background-color: #ddd;"></div>
                        ${createPieChartHtml(isSpecialWallet ? 'Counterparties' : (isCategory ? 'Counterparties' : 'Category'), counterpartiesData, isSpecialWallet)}
                        ${!isSpecialWallet ? `
                            <div style="width: 0.071vw; background-color: #ddd;"></div>
                            ${createPieChartHtml('Sender', senderData, isSpecialWallet)}
                        ` : ''}
                    </div>
                </div>
            `;

            const contentHtml = `
                ${chartsHtml}
                <div style="background-color: white; padding: 1.42vw; border-radius: 0.71vw;">
                    ${tableHtml}
                </div>
                <div id="saveButtonsContainer"></div>
            `;

            const recipientDetailsDiv = document.getElementById('recipientDetailsDiv');
            const detailsContent = document.getElementById('detailsContent');
            detailsContent.innerHTML = `
                ${summaryHtml}
                ${contentHtml}
            `;

            if (isDesktop) {
                const saveButtonsContainer = document.createElement('div');
                    saveButtonsContainer.style.cssText = `
                        display: flex;
                        justify-content: center;
                        border-bottom: solid 20px white;
                    `;
                
                    const buttonStyle = `
                        padding: 1vw 2.35vw;
                        margin: 0 2vw;
                        background-color: #3888ff;
                        color: white;
                        border: none;
                        cursor: pointer;
                        border-radius: 1vw;
                        font-size: 1.28vw;
                        font-family: satoshi;
                    `;
                
                    ['XLSX', 'CSV', 'JSON'].forEach((format, index) => {
                        const button = document.createElement('button');
                        button.textContent = `Save as ${format}`;
                        button.style.cssText = buttonStyle;
                        

                        button.onmouseover = () => button.style.opacity = '0.8';
                        button.onmouseout = () => button.style.opacity = '1';
                        
                        button.onclick = () => saveTableAs(format.toLowerCase(), data.transactions, recipientName);
                        saveButtonsContainer.appendChild(button);
                    });
                detailsContent.appendChild(saveButtonsContainer);
            }
            recipientDetailsDiv.style.display = 'block';

            drawPieChart('pieChartQuarter', quarterData);
            drawPieChart(`pieChart${isSpecialWallet ? 'Counterparties' : (isCategory ? 'Counterparties' : 'Category')}`, counterpartiesData);
            if (!isSpecialWallet) {
                drawPieChart('pieChartSender', senderData);
            }
            setTimeout(() => {
                loadAllAvatars();
            }, 100);
                })
        .catch(error => {
            console.error('Error fetching recipient details:', error);
        });
    }

    function loadAvatar(counterparty) {
        const avatarImgs = document.querySelectorAll(`.avatar-${CSS.escape(counterparty)}`);
        if (avatarImgs.length === 0) return;
    
        const formats = ['jpg', 'png', 'svg', 'gif', 'webp'];
        const folders = ['avatars', 'static_avatars'];
    
        async function tryLoadAvatar() {
            for (const folder of folders) {
                for (const format of formats) {
                        const response = await fetch(`/${folder}/${encodeURIComponent(counterparty)}.${format}`);
                        if (response.ok) {
                            const avatarUrl = `/${folder}/${encodeURIComponent(counterparty)}.${format}`;
                            avatarImgs.forEach(img => {
                                img.src = avatarUrl;
                                img.onerror = () => {
                                    img.src = `https://avatars.jakerunzer.com/${encodeURIComponent(counterparty)}`;
                                };
                            });
                            return;
                        }
                }
            }
    
            avatarImgs.forEach(img => {
                img.src = `https://avatars.jakerunzer.com/${encodeURIComponent(counterparty)}`;
            });
        }
    
        tryLoadAvatar().catch(error => {
            avatarImgs.forEach(img => {
                img.src = `https://avatars.jakerunzer.com/${encodeURIComponent(counterparty)}`;
            });
        });
    }

    function loadAllAvatars() {
        const uniqueCounterparties = new Set();
        document.querySelectorAll('[class^="avatar-"]').forEach(img => {
            const counterparty = img.className.split('avatar-')[1];
            uniqueCounterparties.add(counterparty);
        });
    
        uniqueCounterparties.forEach(loadAvatar);
    }
    
    
    function createPieChartHtml(title, data, isSpecial) {
        const chartId = `pieChart${title}`;
        const widthStyle = isSpecial ? '45%' : '28%';
        return `
            <div style="width: ${widthStyle}; display: flex; flex-direction: column; align-items: center;">
                <h4 style="text-align: center; margin: 0 0 0.71vw 0; font-size: 14px">${title}</h4>
                <div style="width: 100%; aspect-ratio: 1 / 1; position: relative;">
                    <canvas id="${chartId}"></canvas>
                </div>
            </div>
        `;
    } // ???????????
    
    function drawPieChart(chartId, data) {
        const ctx = document.getElementById(chartId).getContext('2d');
        const dataValues = Object.values(data);
        const piecesCount = dataValues.length;
        
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    data: dataValues,
                    backgroundColor: Object.keys(data).map((_, index) => 
                        `hsl(${index * 360 / Object.keys(data).length}, 70%, 60%)`
                    ),
                    borderWidth: 3/piecesCount
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                label += `${percentage}% (${value.toFixed(2)} USD)`;
                                return label;
                            }
                        }
                    }
                }
            },
            plugins: [{
                afterDraw: function(chart) {
                    var ctx = chart.ctx;
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    var chartArea = chart.chartArea;
                    var centerX = (chartArea.left + chartArea.right) / 2;
                    var centerY = (chartArea.top + chartArea.bottom) / 2;
    
                    chart.data.datasets.forEach(function(dataset, datasetIndex) {
                        var meta = chart.getDatasetMeta(datasetIndex);
                        meta.data.forEach(function(element, index) {
                            var model = element;
                            var total = dataset.data.reduce((a, b) => a + b, 0);
                            var percentage = Math.round((dataset.data[index] / total) * 100);
                            var midAngle = element.startAngle + (element.endAngle - element.startAngle) / 2;
                            var x = centerX + Math.cos(midAngle) * (chart.outerRadius / 2);
                            var y = centerY + Math.sin(midAngle) * (chart.outerRadius / 2);
    
                            ctx.fillStyle = '#000';
                            ctx.font = 'bold 0.857vw satoshi';
                            ctx.fillText(percentage + '%', x, y);
                        });
                    });
                    ctx.restore();
                },
                // afterRender: function(chart) {
                //     const legendContainer = document.getElementById(`${chart.canvas.id}Legend`);
                //     legendContainer.innerHTML = '';
    
                //     const itemsPerRow = 3;
                //     let currentRow;
    
                //     chart.legend.legendItems.forEach((item, index) => {
                //         if (index % itemsPerRow === 0) {
                //             currentRow = document.createElement('div');
                //             currentRow.style.display = 'flex';
                //             currentRow.style.justifyContent = 'center';
                //             currentRow.style.width = '100%';
                //             currentRow.style.marginBottom = '0.305vw';
                //             legendContainer.appendChild(currentRow);
                //         }
    
                //         const legendItem = document.createElement('div');
                //         legendItem.style.display = 'flex';
                //         legendItem.style.alignItems = 'center';
                //         legendItem.style.marginRight = '0.71vw';
                //         legendItem.style.fontSize = '1vw';
    
                //         const colorBox = document.createElement('span');
                //         colorBox.style.width = '0.71vw';
                //         colorBox.style.height = '0.71vw';
                //         colorBox.style.backgroundColor = item.fillStyle;
                //         colorBox.style.marginRight = '0.305vw';
    
                //         const label = document.createElement('span');
                //         label.textContent = item.text;
    
                //         legendItem.appendChild(colorBox);
                //         legendItem.appendChild(label);
                //         currentRow.appendChild(legendItem);
                //     });
                // }
            }]
        });
    }

    // Sankey misc. settings

    function sankeyNodeLabelsAlign(position, forcePos) {
        const textAnchor = {left: 'end', right: 'start', center: 'middle'}[position];
        const nodes = document.getElementsByClassName('sankey-node');
        const TEXTPAD = 3;

        Array.from(nodes).forEach((node, index) => {
            const d = node.__data__;
            const label = node.getElementsByClassName('node-label').item(0);
    
            label.setAttribute('x', 0);
    
            if (!d.horizontal)
                return;
            
            const padX = d.nodeLineWidth / 2 + TEXTPAD;
            const posX = padX + d.visibleWidth;
            let x, y;  
    
            const isSpecialCase = zoneSendersList.includes(nodeName[index]);
            const registrarsCase = registrars.some(reg => nodeName[index].startsWith(reg));
            const isSpecialWallet = specialWallets.some(wallet => nodeName[index].startsWith(wallet));
            const isDaoWallet = daoWallet.some(wallet => nodeName[index].startsWith(wallet));

            if (isSpecialCase && currentQuarter === 'big_picture') {
                x = -posX - padX;
                label.setAttribute('text-anchor', 'end');
                label.setAttribute('opacity', '0.6', 'important');
            } else if (isSpecialWallet && currentQuarter === 'big_picture') {
                x = (d.nodeLineWidth + d.visibleWidth) / 2 + (d.left ? padX : -posX);
                label.setAttribute('text-anchor', 'middle');
            } else if (registrarsCase && currentQuarter === 'big_picture') {
                x = -posX - padX;
                label.setAttribute('text-anchor', 'end');
            } else {
                switch (position) {
                    case 'left':
                        if (d.left || d.node.originalLayer === 0 && !forcePos)
                            return;
                        x = -posX - padX;
                        break;
    
                    case 'right':
                        if (!d.left || !forcePos)
                            return;
                        x = posX + padX;
                        break;
    
                    case 'center':
                        if (!forcePos && (d.left || d.node.originalLayer === 0))
                            return;
                        x = (d.nodeLineWidth + d.visibleWidth) / 2 + (d.left ? padX : -posX);
                        break;
                }
                label.setAttribute('text-anchor', textAnchor);
            }
            label.setAttribute('x', x);
        });
    }

    function updateNodeLabels() {
        const nodeLabels = document.querySelectorAll('.node-label');
        nodeLabels.forEach((label, index) => {
            if (index > 0) {
                label.setAttribute('x', '40');
                label.setAttribute('text-anchor', 'start');
            } else {
                label.setAttribute('x', '-40');
                label.setAttribute('text-anchor', 'end');
            }
        });
    }
    
    function disableHoverEffects() {
        Plotly.relayout('sankeyDiagram', {
            'hovermode': false
        });
    } // ??????

    function enableHoverEffects() {
        Plotly.relayout('sankeyDiagram', {
            'hovermode': 'closest'
        });
    } // ??????

    function createFlowBanner(flowInfo, etherscanUrl, txHash) {
        const container = document.getElementById('flowBannerContainer');
        const banner = document.createElement('div');
        banner.className = 'flow-banner';
        banner.id = `flowBanner-${txHash}`;    
        
        const bannerTextStyle = isDesktop 
        ? 'font-size: 1vw'
        : 'font-size: 1.8vw';

        if (etherscanUrl) {
            banner.innerHTML = `
                <span class="close-button">&times;</span>
                <div class="typography--medium" style="${bannerTextStyle}">${flowInfo}</div>
                <a class="typography" href="${etherscanUrl}" target="_blank" style="${bannerTextStyle}">View on Etherscan</a>
            `;
        } else {
            banner.innerHTML = `
            <span class="close-button">&times;</span>
            <div class="typography--medium" style="${bannerTextStyle}">${flowInfo}</div>
        `;
        }
    
        container.appendChild(banner);
    
        setTimeout(() => {
            banner.classList.add('show');
        }, 10);

        openBanners.add(txHash);

        setTimeout(function() {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.remove();
                openBanners.delete(txHash);
            }, 300);
        }, 10000)
    
        const closeButton = banner.querySelector('.close-button');
        closeButton.addEventListener('click', function() {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.remove();
                openBanners.delete(txHash);
            }, 300);
        });
        if (!isDesktop) {
            closeButton.style.display = 'none';
        }
    }

    function shakeBanner(txHash) {
        const banner = document.getElementById(`flowBanner-${txHash}`);
        if (banner) {
            banner.classList.add('shake');
            banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            

            setTimeout(() => {
                banner.classList.remove('shake');
            }, 820); 
        }
    }

    function showCategorySankeyChart(category, quarter) {
        navigator.setCategoryView(quarter, category);
        updateContextButton();
    } // ??????
        
    function showContractorsDropdown(category, clickX, clickY, dropdownQuarter, categoryValue, sender, layout, isSpecial, isQuarter, interquarterOutArgs, interquarterInArgs, sumInArgs, sumOutArgs, swaps) {
    
        const dropdown = document.getElementById('contractorsDropdown');
        const title = document.getElementById('dropdownTitle');
        const list = document.getElementById('contractorsList');
        const options = document.getElementById('chartOptions');
        const specialWallets = ['Ecosystem', 'Public Goods', 'Metagov', 'Community WG', 'Providers'];

        // console.log(swaps);

        const spendingLinksDictionary = {
            "Metagov (2022Q3)": "https://discuss.ens.domains/t/spending-summary-working-groups-term-2-2022/15911",
            "Ecosystem (2022Q3)": "https://discuss.ens.domains/t/spending-summary-working-groups-term-2-2022/15911",
            "Public Goods (2022Q3)": "https://discuss.ens.domains/t/spending-summary-working-groups-term-2-2022/15911",
            "Metagov (2022Q4)": "https://discuss.ens.domains/t/spending-summary-working-groups-term-2-2022/15911",
            "Ecosystem (2022Q4)": "https://discuss.ens.domains/t/spending-summary-working-groups-term-2-2022/15911",
            "Public Goods (2022Q4)": "https://discuss.ens.domains/t/spending-summary-working-groups-term-2-2022/15911",

            "Metagov (2023Q1)": "https://discuss.ens.domains/t/spending-summary-working-groups-term-1-2023/17374",
            "Ecosystem (2023Q1)": "https://discuss.ens.domains/t/spending-summary-working-groups-term-1-2023/17374",
            "Public Goods (2023Q1)": "https://discuss.ens.domains/t/spending-summary-working-groups-term-1-2023/17374",
            "Metagov (2023Q2)": "https://discuss.ens.domains/t/spending-summary-working-groups-term-1-2023/17374",
            "Ecosystem (2023Q2)": "https://discuss.ens.domains/t/spending-summary-working-groups-term-1-2023/17374",
            "Public Goods (2023Q2)": "https://discuss.ens.domains/t/spending-summary-working-groups-term-1-2023/17374",

            "Metagov (2023Q3)": "https://discuss.ens.domains/t/term-4-working-group-spending-summary-jul-2023-dec-2023/18451",
            "Ecosystem (2023Q3)": "https://discuss.ens.domains/t/term-4-working-group-spending-summary-jul-2023-dec-2023/18451",
            "Public Goods (2023Q3)": "https://discuss.ens.domains/t/term-4-working-group-spending-summary-jul-2023-dec-2023/18451",
            "Metagov (2023Q4)": "https://discuss.ens.domains/t/term-4-working-group-spending-summary-jul-2023-dec-2023/18451",
            "Ecosystem (2023Q4)": "https://discuss.ens.domains/t/term-4-working-group-spending-summary-jul-2023-dec-2023/18451",
            "Public Goods (2023Q4)": "https://discuss.ens.domains/t/term-4-working-group-spending-summary-jul-2023-dec-2023/18451",

            "Metagov (2024Q1)": "https://discuss.ens.domains/t/term-5-working-group-spending-summary-2024-q1/19146",
            "Ecosystem (2024Q1)": "https://discuss.ens.domains/t/term-5-working-group-spending-summary-2024-q1/19146",
            "Public Goods (2024Q1)": "https://discuss.ens.domains/t/term-5-working-group-spending-summary-2024-q1/19146",
            "Metagov (2024Q2)": "https://discuss.ens.domains/t/term-5-working-group-spending-summary-2024-q2/19449",
            "Ecosystem (2024Q2)": "https://discuss.ens.domains/t/term-5-working-group-spending-summary-2024-q2/19449",
            "Public Goods (2024Q2)": "https://discuss.ens.domains/t/term-5-working-group-spending-summary-2024-q2/19449",
        };

        const requestLinksDictionary = {
            "Metagov (2022Q2)": "https://snapshot.org/#/ens.eth/proposal/0x90a5f884d59a647a5a78aad8023cf0c00d9efb8499bced7009c60ad90b5e2041",
            "Ecosystem (2022Q2)": "https://snapshot.org/#/ens.eth/proposal/0x8b68ebc34b590488000bd5a73c7fe1e66e7d405ab26eda7c0c8191230363d4d0",
            "Public Goods (2022Q2)": "https://snapshot.org/#/ens.eth/proposal/0x8c05add423e7ab5900113b203326286763d402f88300ebbe65c278ed2488b8d1",
            "Community WG (2022Q2)": "https://snapshot.org/#/ens.eth/proposal/0x29040b3196c4d7109fdb7b55b8bfd5e85dd074d3cb22266e0d94cc42cfad1eb2",

            "Metagov (2022Q3)": "https://snapshot.org/#/ens.eth/proposal/0x46c7294aca8d70ae8213e8e8c6915697c7be1aab731fbb7e534276f7eb0ef2b9",
            "Ecosystem (2022Q3)": "https://snapshot.org/#/ens.eth/proposal/0x97265786d808280adc788e6744dd07afd3ff7e2776527d18f4e19abe1bd6c1a5",
            "Public Goods (2022Q3)": "https://snapshot.org/#/ens.eth/proposal/0x5c96e490f3e28d8269e8fc7e929491fb8fa5e4bd04d3379f0c4f4bb1a42dc23e",

            "Metagov (2023Q1)": "https://snapshot.org/#/ens.eth/proposal/0xd7eff781be059513b5cd64d79e709abbbc653944c9a8c621dc051e7b42a405cb",
            "Ecosystem (2023Q1)": "https://snapshot.org/#/ens.eth/proposal/0x5788bf0f52ce82a1d3f7750a80f3001671ded49e4e0239dbbafd154275c78f8b",
            "Public Goods (2023Q1)": "https://snapshot.org/#/ens.eth/proposal/0x41b3509b88e15677aa15680f48278517f794822fb9a79b9c621def53f1866be7",

            "Metagov (2023Q4)": "https://snapshot.org/#/ens.eth/proposal/0x5c0d103911aaaa64ee33fc35aa30bffd7c1ca04ac2df85fb274414732c45a6f9",
            "Ecosystem (2023Q4)": "https://snapshot.org/#/ens.eth/proposal/0x12a2abca291496c7e990d099240b4c995099dc0fb85767e04f22b9496e953799",
            "Public Goods (2023Q4)": "https://snapshot.org/#/ens.eth/proposal/0x0a7bec3cd182dadbd043e77cf7a610a6e33c5228fabe407cb89c632b578b83a9",

            "Public Goods (2024Q2)": "https://snapshot.org/#/ens.eth/proposal/0xd3437f1c9ece8a309da116be5bffaf31fa40df5361e04e43f9c913970a8746ee",

            "Metagov (2024Q3)": "https://snapshot.org/#/ens.eth/proposal/0x66d355555c24ed0d2fed0aee89e4fe009e2925c84144c4edc707d33e7c19e554",
        };

        function generateValueDivs(arr) {
            if (!arr || arr.every(value => value === '')) {
                return '<div>Nothing</div>';
            }
            return arr.map(value => `<div>${value}</div>`).join('');
        }
        
        function generateSummarySection(title, values, linkType) {
            let linkHtml = '';
            if (linkType && (title === 'RECEIVED' || title === 'SENT')) {
                const link = linkType === 'Spending Summary'
                ? spendingLinksDictionary[dropdownQuarter] ? spendingLinksDictionary[dropdownQuarter] : ''
                : requestLinksDictionary[dropdownQuarter] ? requestLinksDictionary[dropdownQuarter] : '';
                linkHtml = link ? `<a href="${link}" target="_blank" style="text-decoration: none; color: #2f7cff;">${linkType}</a>` : '';
            }
        
            return `
                <div class="summary-section">
                    <div class="summary-header">
                        <div class="summary-title">${title} ${linkHtml}</div>
                    </div>
                    <div class="summary-values">
                        ${generateValueDivs(values)}
                    </div>
                </div>
            `;
        }
        
        function generateSwapsSection(swaps) {
            if (!swaps || swaps.length === 0) {
                return `
                    <div class="swaps-container">
                        <div class="swaps-title">SWAPS</div>
                        <div style="text-align: end;">Nothing</div>
                    </div>
                `;
            }
        
            const swapsHtml = swaps.map(swap => {
                const [input, output, hash] = swap;
                return `
                    <div class="swap-item">
                        <span>${input} → ${output}</span>
                        <a href="${getEtherscanLink(hash)}" target="_blank" class="swap-hash">Etherscan</a>
                    </div>
                `;
            }).join('');
        
            return `
                <div class="swaps-container">
                    <div class="swaps-title">SWAPS</div>
                    ${swapsHtml}
                </div>
            `;
        }

        function parseDropdownQuarter(dropdownQuarter) {
            const match = dropdownQuarter.match(/(.+) \((\d{4})Q(\d)\)/);
            if (match) {
                return {
                    walletName: match[1],
                    year: match[2],
                    quarter: match[3]
                };
            }
            return null;
        }

        if (navigator.walletFilter && specialWallets.includes(category)) {
            showRecipientDetails(category, false);
            return;
        }

        // Order: USDC, ENS, ETH    
    
        const formattedCategoryValue = formatValue(categoryValue, null, null, true);
    
        let url = `/contractors/${encodeURIComponent(category)}?quarter=${dropdownQuarter}`;
    
        if (sender) {
            url += `&sender=${encodeURIComponent(sender)}`;
        }

        const year = dropdownQuarter.split('Q')[0];
        const month = getMonthRange(dropdownQuarter.split('Q')[1]);
    
        fetch(url)
            .then(response => response.json())
            .then(contractors => {
                list.innerHTML = '';

                if (!isSpecial) {
                    dropdown.style.width = 'fit-content';
                    title.innerHTML = `
                        <div class="title-container">
                            <span class="category-title">${category}</span>
                        </div>
                        <hr>
                        <div class="short-summ-container">
                            <div style="font-size: 1vw; /* margin-bottom: 0px; */ /* margin: 0px; */ font-weight: 500;">RECEIVED</div>
                            <div style="font-size: 2.3vw; /* letter-spacing: 0.2vw; */ margin-top: 0; /* font-weight: 400; */ margin-top: -5px;">${formattedCategoryValue}</div>
                            <div style="color: grey; font-size: 1vw; font-weight: 400; margin-top: -5px;">${month} ${year}</div>
                        </div>
                        <hr>
                    `;
                    options.innerHTML = `
                        <button id="chartButton" style="align-self: start;" class="category-chart-button">
                                <img src="/components/icons/SankeyChartIcon.png" alt="Category chart icon">
                                <div style="font-family: satoshi; font-size: 1.14vw; align-self: center;">Detailed Sankey Chart</div>
                        </button>
                        <button id="detailsButton" style="align-self: start;" class="category-chart-button">
                                <img src="/components/icons/ChartIcon.png" alt="Category chart icon">
                                <div style="font-family: satoshi; font-size: 1.14vw; align-self: center;">See All-Time Statistics</div>
                        </button>
                        <hr>
                    `;
                } else {
                    dropdown.style.width = '40vw';
                    let quarterInfo, monthRange, formattedTitle;
                    if (!isQuarter) {
                        quarterInfo = parseDropdownQuarter(dropdownQuarter);
                        monthRange = getMonthRange(quarterInfo.quarter);
                        formattedTitle = `${quarterInfo.walletName} (${monthRange} ${quarterInfo.year})`;
                    }
                    title.innerHTML = `
                        <div class="title-container">
                            <span class="category-title">${!isQuarter ? formattedTitle : category}</span>
                        </div>
                        <hr style="color: #ddd;">
                        <div class="dropdown-content">
                            <div class="column">
                                <div class="column-header">Internal</div>
                                ${generateSummarySection('BROUGHT FORWARD', interquarterInArgs)}
                                ${generateSummarySection('CARRIED DOWN', interquarterOutArgs)}
                            </div>
                            <div class="column">
                                <div class="column-header">External</div>
                                ${generateSummarySection('RECEIVED', sumInArgs, 'Funding Request')}
                                ${generateSummarySection('SENT', sumOutArgs, 'Spending Summary')}
                            </div>
                        </div>
                        ${generateSwapsSection(swaps)}
                    `;
                    options.innerHTML = `
                            <button id="chartButton" style="align-self: start;" class="category-chart-button">
                                    <img src="/components/icons/SankeyChartIcon.png" alt="Category chart icon">
                                    <div style="font-family: satoshi; font-size: 1.14vw; align-self: center;">Detailed Sankey Chart</div>
                            </button>
                            <button id="detailsButton" style="align-self: start;" class="category-chart-button">
                                    <img src="/components/icons/ChartIcon.png" alt="Category chart icon">
                                    <div style="font-family: satoshi; font-size: 1.14vw; align-self: center;">See All-Time Statistics</div>
                            </button>
                        `;
                }

                const chartOption = document.getElementById('chartButton');
                const detailsOption = document.getElementById('detailsButton');

                const match = dropdownQuarter.match(/\((\d{4}Q\d)\)/);

                chartOption.onclick = function(e) {
                    if (specialWallets.includes(category)) {
                        if (match) {
                            e.stopPropagation();
                            dropdown.style.display = 'none';
                            const quarter = match[1];
                            navigator.setQuarter(quarter, true);
                            navigator.setWalletFilter(category);
                        } else if (isQuarter) {
                            e.stopPropagation();
                            dropdown.style.display = 'none';
                            navigator.setQuarter(dropdownQuarter, true);
                            navigator.setWalletFilter(category);
                        }
                    } else {
                        e.stopPropagation();
                        dropdown.style.display = 'none';
                        showCategorySankeyChart(category, dropdownQuarter);
                    }
                }

                detailsOption.onclick = function(e) {
                    e.stopPropagation();
                    dropdown.style.display = 'none';
                    return showRecipientDetails(category, true);
                }

                if ((contractors.length === 0 && !isSpecial)) {
                    return;
                } else {
                    contractors.sort((a, b) => b.value - a.value);
                    const groupedContractors = contractors.reduce((acc, contractor) => {
                        const thru = contractor.thru;
                        if (!acc[thru]) {
                            acc[thru] = [];
                        }
                        acc[thru].push(contractor);
                        return acc;
                    }, {});
                    const thruOrder = ['Direct', ...Object.keys(groupedContractors).filter(key => key !== 'Direct')];
                    thruOrder.forEach(thru => {
                        if (groupedContractors[thru]) {
                            const header = document.createElement('div');
                            header.textContent = thru !== 'Direct' ? `Through ${thru}` : 'Direct';
                            header.className = 'contractor-header';
                            header.style.fontWeight = '500';
                            header.style.paddingBottom = '10px';
                            header.style.borderBottom = '1px solid grey';
                            header.style.textAlign = 'center';
                            header.style.fontSize = '1.5vw';
                            list.appendChild(header);
                
                            groupedContractors[thru].forEach((contractor, index) => {
                            const li = document.createElement('li');
                            li.style.display = 'flex';
                            li.style.justifyContent = 'space-between';
                            li.style.alignItems = 'center';
                            li.style.cursor = 'pointer';
                            li.style.transition = 'background-color 0.3s';

                            if (isDesktop) {
                                li.style.padding = '0.357vw';
                            }
        
                            li.onmouseover = () => { li.style.backgroundColor = '#f0f0f0'; };
                            li.onmouseout = () => { li.style.backgroundColor = 'transparent'; };
        
                            const img = document.createElement('img');

                            if (isDesktop) {
                                img.style.width = '2.35vw';
                                img.style.height = '2.35vw';
                                img.style.marginRight = '0.71vw';
                            } else {
                                img.style.width = '7vw';
                                img.style.height = '7vw';
                                img.style.marginRight = '3.5vw';
                            }

                            img.style.borderRadius = '50%';
        
                            const formats = ['jpg', 'png', 'svg', 'gif', 'webp'];
                            const folders = ['avatars', 'static_avatars'];
                            let avatarFound = false;
        
                            function tryNextFormat(folderIndex, formatIndex) {
                                if (folderIndex >= folders.length) {
                                    img.src = `https://avatars.jakerunzer.com/${contractor.name}`;
                                    return;
                                }
        
                                if (formatIndex >= formats.length) {
                                    tryNextFormat(folderIndex + 1, 0);
                                    return;
                                }
        
                                const folder = folders[folderIndex];
                                const format = formats[formatIndex];
                                fetch(`/${folder}/${contractor.name}.${format}`)
                                    .then(response => {
                                        if (response.ok) {
                                            avatarFound = true;
                                            img.src = `/${folder}/${contractor.name}.${format}`;
                                        } else {
                                            tryNextFormat(folderIndex, formatIndex + 1);
                                        }
                                    })
                                    .catch(() => tryNextFormat(folderIndex, formatIndex + 1));
                            }
        
                            tryNextFormat(0, 0);
        
                            const nameSpan = document.createElement('span');
                            nameSpan.textContent = `${contractor.name}`;
                            nameSpan.style.flex = '1';
        
                            const valueSpan = document.createElement('span');
                            valueSpan.textContent = formatValue(contractor.value, null, null, true);
                            valueSpan.style.marginLeft = '0.714vw';
        
                            const leftDiv = document.createElement('div');
                            leftDiv.style.display = 'flex';
                            leftDiv.style.alignItems = 'center';
                            leftDiv.appendChild(img);
                            leftDiv.appendChild(nameSpan);
        
                            li.appendChild(leftDiv);
                            li.appendChild(valueSpan);
        
                            li.onclick = function() {
                                showRecipientDetails(contractor.name, false);
                                dropdown.style.display = 'none';
                            };
                            if (contractors.length > 1 || contractors[0].name !== category) {
                                list.appendChild(li);
                            }
                            });
                        }
                    })
                }
                
    
                dropdown.style.display = 'block';
                const dropdownRect = dropdown.getBoundingClientRect();

                let left;
                
                if (navigator.currentView === 'big_picture' || navigator.currentView === 'quarter' && !isSideMenuExpanded) {
                    left = Math.min(clickX, layout.width - dropdownRect.width);
                } else if (navigator.currentView === 'wallet') {
                    if (isSideMenuExpanded) {
                        left = layout.width - dropdownRect.width + window.innerWidth*0.225;
                    } else {
                        left = layout.width - dropdownRect.width
                    }
                } else {
                    left = Math.min(clickX, layout.width - dropdownRect.width + window.innerWidth*0.225);
                }
                let top = clickY;
                if (isDesktop) {
                    // const isReversed = navigator.currentView !== 'wallet' ? ('big_picture' ? (clickY + dropdownRect.height) > layout.height * 0.75 : (clickY) > layout.height * 0.8) : true;
        
                    // if (isReversed) {
                    //     top = clickY - dropdownRect.height;
                    //     if (navigator.currentView === 'quarter' || navigator.currentView === 'wallet') {
                    //         dropdown.style.flexDirection = 'column';
                    //     } else {
                    //         dropdown.style.flexDirection = 'column-reverse';
                    //     }
                    // } else {
                    //     dropdown.style.flexDirection = 'column';
                    // }

                    const isReversed = navigator.currentView === 'wallet' 
                    ? true 
                    : (navigator.currentView === 'quarter' 
                        ? clickY > layout.height * 0.8 || (dropdownRect.height > clickY/layout.height*0.5 && clickY > layout.height * 0.75)
                        : false);
        
                    if (isReversed) {
                        top = clickY - dropdownRect.height;
                        if (navigator.currentView === 'quarter' || navigator.currentView === 'wallet') {
                            dropdown.style.flexDirection = 'column';
                        } else {
                            dropdown.style.flexDirection = 'column-reverse';
                        }
                    } else {
                        dropdown.style.flexDirection = 'column';
                    }
                    
                    if (navigator.currentView === 'big_picture') {
                        left = Math.max(0, Math.min(left, layout.width - dropdownRect.width));
                        top = Math.max(0, Math.min(top, layout.height - dropdownRect.height));
                    }

                    if (navigator.currentView === 'quarter' || navigator.currentView === 'wallet') {
                        dropdown.style.maxHeight = '300px';
                    }
        
                    dropdown.style.left = `${left}px`;
                    dropdown.style.top = `${top}px`;
                } else {
                    dropdown.style.display = 'flex';
                    dropdown.style.position = 'fixed';
                    dropdown.style.left = `50%`;
                    dropdown.style.top = `50%`;
                    dropdown.style.transform = 'translate(-50%, -50%)';
                    dropdown.style.width = '80%';
                    dropdown.style.height = '80%';
                    dropdown.style.flexDirection = 'column';
                }
        
                function closeDropdownOnOutsideClick(event) {
                    if (!dropdown.contains(event.target)) {
                        dropdown.style.display = 'none';
                        document.removeEventListener('click', closeDropdownOnOutsideClick);
                    }
                }
    
                setTimeout(() => {
                    document.addEventListener('click', closeDropdownOnOutsideClick);
                }, 0);
            })
            .catch(error => {
                console.error('Error fetching contractors:', error);
            });
    }

    function closeContractorsDropdown(event) {
        const dropdown = document.getElementById('contractorsDropdown');
        const isClickInside = dropdown.contains(event.target);

        if (!isClickInside && dropdown.style.display === 'block') {
            dropdown.style.display = 'none';
        }
    }

    function updateChart() {
      
        if (navigator.currentCategory) {
          if (isPieChart) {
            drawCategoryPieChart(navigator.currentQuarter, navigator.currentCategory);
          } else {
            drawCategorySankey(navigator.currentQuarter, navigator.currentCategory);
          }
        } else if (navigator.walletFilter) {
          if (isPieChart) {
            drawWalletPieChart(navigator.currentQuarter, navigator.walletFilter);
          } else {
            drawSankey(navigator.currentQuarter, navigator.walletFilter, hideMode);
          }
        } else {
          drawSankey(navigator.currentQuarter, null, hideMode);
        }
        updateChartTypeToggleVisibility();
    }

    function updateChartTypeToggleVisibility() {
        const chartTypeToggle = document.getElementById('chartTypeToggle');
        if (navigator.currentCategory || navigator.walletFilter) {
          chartTypeToggle.style.display = 'flex';
        } else {
          chartTypeToggle.style.display = 'none';
        }
    }

    function drawWalletPieChart(quarter, wallet) {
    const sankeyDiv = document.getElementById('sankeyDiagram');
    if (!sankeyDiv) {
        console.error("Sankey diagram container not found");
        return;
    }
    
    fetch(`/data/${quarter}/${wallet}`)
        .then(response => response.json())
        .then(data => {
        const pieData = processSankeyDataForPieChart(data, wallet);
        
        const getWidth = window.innerWidth;
        const getHeight = window.innerHeight;
        const heightCalibration = getHeight / 820;
        const widthCalibration = getWidth / 1440;
    
        const layout = {
            width: isDesktop ? (isSideMenuExpanded ? (0.77*getWidth) : getWidth) : 1440,
            height: isDesktop ? 900*heightCalibration : 900,
            margin: { 
            l: isDesktop ? (isSideMenuExpanded ? getWidth*0.04 : getWidth*0.01) : 50,
            r: isDesktop ? getWidth*0.01 : 50, 
            t: isDesktop ? 150*heightCalibration : 150, 
            b: isDesktop ? 150*heightCalibration : 150 
            },
            showlegend: true,
            legend: {
            x: 1,
            y: 0.5,
            xanchor: 'left',
            yanchor: 'middle',
            orientation: 'vertical',
            font: {
                size: 14*widthCalibration,
                family: "satoshi"
            }
            },
            annotations: [{
            x: isSideMenuExpanded ?
            1.12
            : 1.07,
            y: isDesktop 
                ? navigator.currentView === 'quarter' ? 1.25 : 1.15
                : 1.05,
            xref: 'paper',
            yref: 'paper',
            text: `Quarter: ${quarter}, Wallet: ${wallet}`,
            showarrow: false,
            font: {
                size: isDesktop ? 18*widthCalibration : 18,
                color: 'black',
                family: "satoshi"
            },
            xanchor: 'end',
            yanchor: 'middle'
            }]
        };
    
        const pieChart = {
            type: 'pie',
            labels: pieData.labels,
            values: pieData.values,
            textinfo: 'percent',
            insidetextorientation: 'radial',
            hoverinfo: 'label+percent+value',
            textfont: {
            size: 14,
            family: "satoshi"
            }
        };
    
        Plotly.newPlot(sankeyDiv, [pieChart], layout, {displayModeBar: false});
        })
        .catch(error => console.error("Error drawing wallet pie chart:", error));
    }
    
    function drawCategoryPieChart(quarter, category) {
    const sankeyDiv = document.getElementById('sankeyDiagram');
    if (!sankeyDiv) {
        console.error("Sankey diagram container not found");
        return;
    }
    
    fetch(`/category-sankey-data/${encodeURIComponent(category)}/${quarter}`)
        .then(response => response.json())
        .then(({ data }) => {
        const pieData = processSankeyDataForPieChart(data[0]);
        
        const getWidth = window.innerWidth;
        const getHeight = window.innerHeight;
        const heightCalibration = getHeight / 820;
        const widthCalibration = getWidth / 1440;
    
        const layout = {
            width: isDesktop ? (isSideMenuExpanded ? (0.77*getWidth) : getWidth) : 1440,
            height: isDesktop ? 900*heightCalibration : 900,
            margin: { 
            l: isDesktop ? (isSideMenuExpanded ? getWidth*0.04 : getWidth*0.01) : 50,
            r: isDesktop ? getWidth*0.01 : 50, 
            t: isDesktop ? 150*heightCalibration : 150, 
            b: isDesktop ? 150*heightCalibration : 150 
            },
            xanchor: 'end',
            yanchor: 'middle',
            xref: 'paper',
            yref: 'paper',
            showlegend: true,
            legend: {
                x: 1,
                y: 0.5,
                xanchor: 'left',
                yanchor: 'middle',
                orientation: 'vertical',
                font: {
                size: 14*widthCalibration,
                family: "satoshi"
            }
            },
        };
    
        const pieChart = {
            type: 'pie',
            labels: pieData.labels,
            values: pieData.values,
            textinfo: 'percent',
            insidetextorientation: 'radial',
            hoverinfo: 'label+percent+value',
            textfont: {
            size: 14*widthCalibration,
            family: "satoshi"
            },
        };
    
        Plotly.newPlot(sankeyDiv, [pieChart], layout, {displayModeBar: false});
        })
        .catch(error => console.error("Error drawing category pie chart:", error));
    }
    
    function processSankeyDataForPieChart(sankeyData, walletFilter = null) {
    const values = [];
    const labels = [];
    
    if (walletFilter) {
        sankeyData.nodes.forEach((node, index) => {
        if (node.name !== walletFilter) {
            const value = sankeyData.links.find(link => link.target === index)?.value || 0;
            values.push(value);
            labels.push(node.name);
        }
        });
    } else {
        sankeyData.link.source.forEach((source, index) => {
        const target = sankeyData.link.target[index];
        const value = sankeyData.link.value[index];
        
        const targetLabel = sankeyData.node.label[target];
        const splitLabels = targetLabel.split(' - ')[1];
        
        values.push(value);
        labels.push(splitLabels);
        });
    }
    
    
    return {
        values: values,
        labels: labels
    };
    }

    // Main function to render sankey data
    const drawSankey = (quarter, walletFilter = null, useHideMode = hideMode) => {
        currentQuarter = quarter;
        currentWalletFilter = walletFilter;
        period = quarter;
        useHideMode = hideMode;
        navigator.currentQuarter = quarter;
        navigator.walletFilter = walletFilter;
        navigator.hideMode = useHideMode;

        updateChartTypeToggleVisibility();

        if (isPieChart && walletFilter) {
            drawWalletPieChart(quarter, walletFilter);
            return;
        }

        // Adaptive layout

        function updateSankeyDiagramAfterOrientationChange() {
            sankeyContainer.style.width = `${getWidth}px`;
            sankeyContainer.style.height = `${getHeight}px`;
            drawSankey(currentQuarter, currentWalletFilter, hideMode);
        }

        function handleOrientationChange() {
            setTimeout(() => {
                updateSankeyDiagramAfterOrientationChange();
            }, 100);
        }

        window.addEventListener("orientationchange", handleOrientationChange);

        const getWidth = window.innerWidth;
        const getHeight = window.innerHeight;

        const heightCalibration = getHeight / 820;
        const widthCalibration = getWidth / 1440;
        
        width = isDesktop ? Math.max(getWidth, 800) : getWidth;
        height = isDesktop ? Math.max(getHeight, 600) : getHeight;
        
        let url;
        if (period === 'big_picture') {
            navigator.currentView = 'big_picture';
            url = `/data/big_picture?hideMode=${hideMode}`;
        } else if (period.match(/^\d{4}$/)) {
            navigator.currentView = 'year';
            url = `/data/year/${period}`;
        } else if (walletFilter) {
            navigator.currentView = 'wallet';
            url = `/data/${period}/${walletFilter}`;
        } else {
            navigator.currentView = 'quarter';
            url = `/data/${period}`;
        }

        // Button-killer

        if (navigator.currentView !== 'big_picture') {
            hideModeContainer.style.display = 'none';
        } else {
            hideModeContainer.style.display = 'flex';
        }

        // Sankey Settings
        fetch(url)
            .then(response => response.json())
            .then(data => {
                zoneSendersList = data.zoneSendersList || [];
                qtrSendersList = data.qtrSendersList || [];
                qtrReceiversList = data.qtrReceiversList || [];
                specialWallets = ['Ecosystem', 'Public Goods', 'Metagov', 'Community WG', 'Providers'];
                nodeName = data.nodes.map(node => node.bpIndex);

                    const sankeyData = {
                        type: "sankey",
                        orientation: "h",
                        arrangement: "fixed",
                        node: {
                            pad: data.pad,
                            thickness: walletFilter ? (isDesktop ? 150*widthCalibration : 150) 
                            : (navigator.currentView === 'big_picture' ? (isDesktop ? 15*widthCalibration : 15) 
                            : (isDesktop ? 100*widthCalibration : 100)),
                            line: {
                                color: "grey",
                                width: navigator.currentView === 'big_picture' ? 1*widthCalibration : 0.5*widthCalibration
                            },
                            font: {
                                family: "satoshi",
                                color: "black",
                                size: 25,
                            },
                            label: navigator.currentView === 'big_picture' ? data.nodes.map(node => 
                                node.name.startsWith('DAO Wallet') ? '' : node.name
                            ) : data.nodes.map(node => node.name),
                            customdata: data.nodes.map(node => node.customdata),
                            color: navigator.currentView === 'big_picture' ? data.nodes.map(node => 
                                node.name.startsWith('DAO Wallet') ? 'rgba(250, 255, 232, 1)' : 'white'
                            ) : 'white',
                            x: data.nodes.map(node => node.x),
                            y: data.nodes.map(node => node.y),
                            hovertemplate: '%{label}<br>Value: %{value}<extra></extra>'
                        },
                        link: {
                            source: data.links.map(link => link.source),
                            target: data.links.map(link => link.target),
                            value: data.links.map(link => link.value),
                            color: data.links.map(link => link.color),
                            customdata: data.links.map(link => ({
                                label: link.label,
                                receipt: link.customdata.receipt,
                                date: link.customdata.date,
                                from: link.customdata.from,
                                to: link.customdata.to,
                                value: link.customdata.value,
                                symbol: link.customdata.symbol,
                                usd: link.customdata.usd,
                                qtr: link.customdata.qtr,
                                addr: link.customdata.addr,
                            })),
                            hoverlabel: {align: "left", bordercolor: "white", bgcolor: "white", font: {color: "black", size: 14, family: "Satoshi"}},
                            hovertemplate: '%{customdata.label}<extra></extra>',
                        }
                    };

                    let shapes = [];
                    let annotations = [];

                    // Layers
                    if (navigator.currentQuarter === 'big_picture') {
                        const quarterCount = data.conditions.quarterCount;
                        const border = 0.01;
                        const quarterNumber = (1 - border) / quarterCount;
                        let currentYear = 2022;
                        let currentQuarterIndex = 2;
                        for (let i = 1; i <= quarterCount; i++) {
                            const lineX = i * quarterNumber + border;

                            shapes.push({
                                type: 'line',
                                x0: lineX,
                                y0: 0,
                                x1: lineX,
                                y1: isDesktop ? 1.085 : 1.15,
                                xref: 'paper',
                                yref: 'paper',
                                line: {
                                    color: 'grey',
                                    width: isDesktop ? 1*widthCalibration : 1,
                                    dash: 'solid'
                                }, 
                            });
                            
                            shapes.push({
                                type: 'line',
                                x0: -0.05,
                                y0: 1,
                                x1: 1.05,
                                y1: 1,
                                xref: 'paper',
                                yref: 'paper',
                                line: {
                                    color: 'grey',
                                    width: isDesktop ? 1*heightCalibration : 1,
                                    dash: 'solid'
                                },
                            });

                            const monthRange = getMonthRange(currentQuarterIndex);
        
                            const annotationX = (lineX + border) - quarterNumber;

                            if (monthRange === 'Jan-Mar' || i === 1) {
                                annotations.push({
                                    x: annotationX,
                                    y: 1.02,
                                    xref: 'paper',
                                    yref: 'paper',
                                    font: {
                                        family: "satoshi",
                                        size: isDesktop ? 36*widthCalibration : 36,
                                        color: 'black',
                                        weight: 900
                                    },
                                    showarrow: false,
                                    text: `${currentYear}`,
                                    xanchor: 'center',
                                    yanchor: 'bottom'
                                });
                            }
                            
                            annotations.push({
                                x: annotationX,
                                y: 1.02,
                                xref: 'paper',
                                yref: 'paper',
                                font: {
                                    family: "satoshi",
                                    size: isDesktop ? 26*widthCalibration : 24,
                                    color: 'black',
                                    weight: 600
                                },
                                showarrow: false,
                                text: monthRange,
                                xanchor: 'center',
                                yanchor: 'top',
                                quarterIndex: i
                            });
                    
                            currentQuarterIndex++;
                            if (currentQuarterIndex > 4) {
                                currentQuarterIndex = 1;
                                currentYear++;
                            }

                            layout = {
                                width: isDesktop ? (600*quarterCount)*(width/1440) : 600*quarterCount,
                                height: isDesktop ? 2000*heightCalibration : 2000,
                                margin: { 
                                    l: 0, 
                                    r: 0, 
                                    t: isDesktop ? 2000*heightCalibration*0.05 : 100, 
                                    b: 0
                                },
                                shapes: shapes,
                                annotations: annotations,
                                font: {
                                    size: isDesktop ? 12*widthCalibration : 14,
                                    family: "satoshi",
                                }, 
                                dragmode: 'none',
                                hovermode: 'closest',
                                clickmode: 'event',
                                paper_bgcolor: 'white',
                                plot_bgcolor: 'white',
                            };
                        };

                    } else { 
                        // const currentModel = data.model;
                        // annotations.push({
                        //     x: 0.9,
                        //     y: 0.9,
                        //     xref: 'paper',
                        //     yref: 'paper',
                        //     font: {
                        //         size: 18,
                        //         color: 'black'
                        //     },
                        //     showarrow: false,
                        //     text: `model: ${currentModel}`,
                        //     xanchor: 'center',
                        //     yanchor: 'middle',
                        //     dragmode: 'none',
                        // });

                        annotations.push({
                            x: isDesktop 
                            ? navigator.currentView === 'quarter' 
                                ? isSideMenuExpanded 
                                    ? 1 
                                    : 0.985
                                : isSideMenuExpanded 
                                    ? 1 
                                    : 0.985
                            : 0.985,
                            y: isDesktop 
                            ? navigator.currentView === 'quarter' ? 1.25 : 1.15
                            : 1.05,
                            xref: 'paper',
                            yref: 'paper',
                            font: {
                                size: isDesktop ? 18*widthCalibration : 18,
                                color: 'black',
                                family: "satoshi"
                            },
                            showarrow: false,
                            text: navigator.currentView === 'quarter' 
                            ? `Quarter: ${navigator.currentQuarter}`
                            : `Quarter: ${navigator.currentQuarter}, Wallet: ${navigator.walletFilter}`,
                            xanchor: 'end',
                            yanchor: 'middle',
                            dragmode: 'none',
                        });
                        
                        if (walletFilter) {
                            layout = {
                                width: isDesktop ? (isSideMenuExpanded ? (0.77*getWidth) : getWidth) : 1440,
                                height: isDesktop ? 900*heightCalibration : 900,
                                margin: { 
                                    l: isDesktop ? (isSideMenuExpanded ? getWidth*0.04 : getWidth*0.01) : 50,
                                    r: isDesktop ? getWidth*0.01 : 50, 
                                    t: isDesktop ? 150*heightCalibration : 150, 
                                    b: isDesktop ? 150*heightCalibration : 150 },
                                dragmode: 'none',
                                hovermode: 'closest',
                                clickmode: 'event',
                                paper_bgcolor: 'white',
                                plot_bgcolor: 'white',
                                annotations: annotations,
                                font: {
                                    family: "satoshi",
                                    size: isDesktop ? 12*widthCalibration : 14,
                                }
                            };
                        } else {
                            layout = {
                                width: isDesktop ? (isSideMenuExpanded ? (0.77*getWidth) : getWidth) : 1440,
                                height: isDesktop ? 635*heightCalibration : 670,
                                margin: { 
                                    l: isDesktop ? (isSideMenuExpanded ? getWidth*0.04 : getWidth*0.01) : 50,
                                    r: isDesktop ? getWidth*0.01 : 50, 
                                    t: isDesktop ? 150*heightCalibration : 150, 
                                    b: isDesktop ? 150*heightCalibration : 150 },
                                dragmode: 'none',
                                hovermode: 'closest',
                                clickmode: 'event',
                                annotations: annotations,
                                paper_bgcolor: 'white',
                                plot_bgcolor: 'white',
                                font: {
                                    family: "satoshi",
                                    size: isDesktop ? 15*widthCalibration : 14,
                                    weight: 400
                                },
                                cursor: 'pointer',
                            };
                        }
                    };
                
                    const config = {
                        displayModeBar: false,
                        responsive: false,
                        scrollZoom: false,
                        doubleClick: false,
                        showTips: false,
                        showAxisDragHandles: false,
                        showAxisRangeEntryBoxes: false,
                        modeBarButtonsToRemove: ['zoom', 'pan', 'select', 'autoScale', 'resetScale'],
                    };
                

            window.scrollTo(0, 0);
            sankeyContainer.scrollTo(0, 0);

            if (navigator.currentView !== 'big_picture') {
                if (isDesktop) {
                    sankeyContainer.style.setProperty('overflow', 'hidden');
                } else {
                    sankeyContainer.style.setProperty('overflow', 'auto');
                }
            } else {
                sankeyContainer.style.setProperty('overflow', 'auto');
            }

            if (!isDesktop && navigator.currentView === 'big_picture') {
                addHideModeDevice();
            } else if (!isDesktop && navigator.currentView !== 'big_picture') {
                const mobileHideModeContainer = document.getElementById('mobileHideModeContainer');
                if (mobileHideModeContainer) {
                    mobileHideModeContainer.remove();
                }
            }
            
            // Listeners
            Plotly.react(sankeyDiv)
            .then(() => {
                sankeyDiv.removeAllListeners('plotly_click');
                if (navigator.currentQuarter !== 'big_picture') {
                    if (!walletFilter) {
                        const highestY = data.maxY;
                        const padding = 50*heightCalibration;
                        const newHeight = (highestY*(544*innerHeight/820)) + padding;
                        const selectNonecontainer = sankeyDiv.querySelector('.user-select-none.svg-container');
                        const allSvgs = sankeyDiv.querySelectorAll('svg.main-svg');
                    
                        selectNonecontainer.style.height = `${newHeight}px`;
                        sankeyContainer.style.height = `${newHeight}px`
                    
                        allSvgs.forEach(svg => {
                            svg.setAttribute('height', newHeight);
                        });
    
                        const plotArea = sankeyDiv.querySelector('.plot-container.plotly');
                        const currentViewBox = plotArea.getAttribute('viewBox').split(' ');
    
                        currentViewBox[3] = newHeight;
                        plotArea.setAttribute('viewBox', currentViewBox.join(' '));
                    
                        const clipPath = sankeyDiv.querySelector('clipPath rect');
                        if (clipPath) {
                            clipPath.setAttribute('height', newHeight);
                        }                
                    } else {
                        sankeyData.node.forEach((node, index) => {
                            if (specialWallets.some(wallet => node.name.startsWith(wallet))) {
                                sankeyData.node.thickness = sankeyData.node.thickness || {};
                                sankeyData.node.thickness[index] = 100;
                            }
                        });
    
                        const newHeight = 1000*heightCalibration;
                        const selectNonecontainer = sankeyDiv.querySelector('.user-select-none.svg-container');
                        const allSvgs = sankeyDiv.querySelectorAll('svg.main-svg');
    
                        selectNonecontainer.style.height = `${newHeight}px`;
                        sankeyContainer.style.height = `${newHeight}px`
    
                        allSvgs.forEach(svg => {
                            svg.setAttribute('height', newHeight);
                        });
    
                        const plotArea = sankeyDiv.querySelector('.plot-container.plotly');
                        const currentViewBox = plotArea.getAttribute('viewBox').split(' ');
    
                        currentViewBox[3] = newHeight;
                        plotArea.setAttribute('viewBox', currentViewBox.join(' '));
                    
                        const clipPath = sankeyDiv.querySelector('clipPath rect');
                        if (clipPath) {
                            clipPath.setAttribute('height', newHeight);
                        }              
                    }
                } else {
                    if (isDesktop) {
                        sankeyContainer.style.height = '100vh';
                        sankeyDiv.style.height = '100%';
                    } else {
                        sankeyContainer.style.height = '2000px';
                        sankeyDiv.style.height = '100%';
                    }
                } 
                if (isDesktop) {
                    if (navigator.currentView === 'big_picture') {
                        const dragOverlay = document.createElement('div');
                        dragOverlay.style.position = 'absolute';
                        dragOverlay.style.userSelect = 'none';
                        dragOverlay.style.webkitUserSelect = 'none';
                        dragOverlay.style.mozUserSelect = 'none';
                        dragOverlay.style.msUserSelect = 'none';
                        dragOverlay.style.top = 0;
                        dragOverlay.style.left = 0;
                        dragOverlay.style.width = '100%';
                        dragOverlay.style.height = '100%';
                        dragOverlay.style.cursor = 'grabbing';
                        dragOverlay.style.background = 'transparent';
                        dragOverlay.style.display = 'none';
                        dragOverlay.style.zIndex = -1000;
                        sankeyContainer.appendChild(dragOverlay);
                    
                        let isDragging = false;
                        let startX, startY;
                        let startScrollLeft, startScrollTop;
                        let lastX, lastY;
                        let animationFrameId = null;

                        const debounce = (func, delay) => {
                            let inDebounce;
                            return function() {
                                const context = this;
                                const args = arguments;
                                clearTimeout(inDebounce);
                                inDebounce = setTimeout(() => func.apply(context, args), delay);
                            }
                        }

                        const debouncedEnableHoverEffects = debounce(enableHoverEffects, 100);
                    
                        function updateScroll() {
                            if (!isDragging) return;
                        
                            const dx = lastX - startX;
                            const dy = lastY - startY;
                            sankeyContainer.scrollLeft = startScrollLeft - dx;
                            sankeyContainer.scrollTop = startScrollTop - dy;
                        
                            animationFrameId = requestAnimationFrame(updateScroll);
                        }                    
                    
                        function startDragging(event) {
                            if (event.button !== 0) return;
                            event.preventDefault();
                    
                            isDragging = true;
                            startX = lastX = event.pageX;
                            startY = lastY = event.pageY;
                            startScrollLeft = sankeyContainer.scrollLeft;
                            startScrollTop = sankeyContainer.scrollTop;
                    
                            dragOverlay.style.display = 'block';
                            dragOverlay.style.cursor = 'grabbing';
                            disableHoverEffects();
                    
                            document.addEventListener('mousemove', throttledMouseMove);
                            document.addEventListener('mouseup', stopDragging);
                    
                            animationFrameId = requestAnimationFrame(updateScroll);
                        }
                    
                        function onMouseMove(event) {
                            if (!isDragging) return;
                            lastX = event.pageX;
                            lastY = event.pageY;
                        }

                        function throttle(func, limit) {
                            let inThrottle;
                            return function() {
                                const args = arguments;
                                const context = this;
                                if (!inThrottle) {
                                    func.apply(context, args);
                                    inThrottle = true;
                                    setTimeout(() => inThrottle = false, limit);
                                }
                            }
                        }
                        
                        const throttledMouseMove = throttle(onMouseMove, 1);
                    
                        function stopDragging() {
                            if (!isDragging) return;
                    
                            isDragging = false;
                            dragOverlay.style.display = 'none';
                            dragOverlay.style.cursor = 'grab';
                            enableHoverEffects();
                    
                            document.removeEventListener('mousemove', throttledMouseMove);
                            document.removeEventListener('mouseup', stopDragging);

                            debouncedEnableHoverEffects();
                    
                            if (animationFrameId) {
                                cancelAnimationFrame(animationFrameId);
                            }
                        }

                        if (navigator.currentView === 'quarter') {
                            sankeyContainer.removeChild(dragOverlay);
                        }
                    
                        sankeyContainer.addEventListener('mousedown', startDragging);
                    }
                }
            });

            Plotly.react(sankeyDiv, [sankeyData], layout, config)
            .then(() => {
                sankeyNodeLabelsAlign(navigator.currentView === 'big_picture' ? 'right' : 'center', true);
                sankeyDiv.removeAllListeners('plotly_click');
                

                const annotationElements = sankeyDiv.querySelectorAll('.annotation-text-g');
                annotationElements.forEach((el, index) => {
                    el.style.pointerEvents = 'all';
                    el.style.cursor = 'pointer';
                });

                const rectLabelElement = sankeyDiv.querySelectorAll('.sankey-node');
                rectLabelElement.forEach((el, index) => {
                    el.style.pointerEvents = 'all';
                    el.style.cursor = 'pointer';
                });

                const textLabelElement = sankeyDiv.querySelectorAll('.node-label');
                textLabelElement.forEach((el, index) => {
                    el.style.pointerEvents = 'all';
                    el.style.cursor = 'pointer';
                });

                const plotlyElement = sankeyDiv.querySelector('.js-plotly-plot .plotly .cursor-crosshair');
                if (plotlyElement) {
                    if (navigator.currentView !== 'big_picture') {
                        plotlyElement.style.setProperty('cursor', 'default', 'important');
                    } 
                }

                function getYear(quarterIndex) {
                    if (quarterIndex <= 3) {
                        return 2022;
                    }
                    const baseYear = 2022;
                    const yearOffset = Math.floor(quarterIndex / 4);
                    return baseYear + yearOffset;
                }

                if (navigator.currentView === 'big_picture') {
                    sankeyDiv.on('plotly_clickannotation', function(eventData) {
                        const clickedQuarter = eventData.annotation.text;
                        const quarterIndex = eventData.annotation.quarterIndex;
                        const year = getYear(quarterIndex);
                        const quarterMap = {'Jan-Mar': 'Q1', 'Apr-Jun': 'Q2', 'Jul-Sep': 'Q3', 'Oct-Dec': 'Q4'};
                        const clicked = `${year}${quarterMap[clickedQuarter]}`;

                        if (clicked.match(/^\d{4}Q\d$/) && clicked !== '2024Q4') {
                            navigator.setQuarter(clicked);
                        } else if ((clicked.match(/^\d{4}$/))) {
                            navigator.setYear(clicked);
                        }
                    });
                } else {
                    sankeyDiv.on('plotly_click', function(eventData) {
                        const clickedPoint = eventData.points[0];
                        const quarterLabel = clickedPoint.label;
                        if (navigator.currentView === 'quarter') {
                            if (quarterLabel.match(/^\d{4}Q\d$/) && clickedPoint !== '2024Q4') {
                                navigator.setQuarter(quarterLabel);
                            }
                        } else if (navigator.currentView === 'wallet') {
                            if (quarterLabel.match(/^\d{4}Q\d$/) && clickedPoint !== '2024Q4') {
                                navigator.currentQuarter = quarterLabel;
                                navigator.updateDiagram();
                            }
                        }
                    });
                }

               if ((navigator.currentView !== 'big_picture') && (!navigator.walletFilter)) {
                    const nodes = document.getElementsByClassName('sankey-node');
                    const fontSizeMisc = isDesktop ? `${12*widthCalibration}px` : '12px';
                    const fontSizebig = isDesktop ? `${14*widthCalibration}px` : '14px';
                    Array.from(nodes).forEach((node, index) => {
                        const nodeName = data.nodes[index].bpIndex;
                        const label = node.getElementsByClassName('node-label')[0];
                        if (qtrSendersList.includes(nodeName)) {
                            label.style.fontSize = fontSizeMisc;
                            label.setAttribute('y', -2)
                            label.setAttribute('opacity', '0.6')
                        } else if (qtrReceiversList.includes(nodeName)) {
                            label.style.fontSize = fontSizeMisc;
                            label.setAttribute('y', -2)
                        } else if (nodeName.startsWith('Unspent')) {
                            label.style.fontSize = fontSizeMisc;
                            label.setAttribute('y', -2)
                        } else if (specialWallets.includes(nodeName)) {
                            label.style.fontSize = fontSizebig;
                            label.setAttribute('y', -2)
                        }
                    });
                }

                if (navigator.currentView !== 'wallet') {
                    const nodes = document.getElementsByClassName('sankey-node');
                    Array.from(nodes).forEach((node, index) => {
                        const nodeName = data.nodes[index].name;
                        const label = node.getElementsByClassName('node-label')[0];
                        if (nodeName === 'Dissolution') {
                            label.style.opacity = 0;
                        }
                    });
                }

                sankeyDiv.on('plotly_click', function(eventData) {
                    const clickedPoint = eventData.points[0];
                    console.log('Clicked point:', clickedPoint);
                
                    if (clickedPoint.childrenNodes) {
                        if (navigator.currentView === 'big_picture') {
                            if (specialWallets.includes(clickedPoint.label)) {
                                let ethSumOut = 0, ensSumOut = 0, usdcSumOut = 0;
                                let ethInterOut = '', ensInterOut = '', usdcInterOut = '';
                                if (clickedPoint.sourceLinks && clickedPoint.sourceLinks.length > 0) {
                                    clickedPoint.sourceLinks.forEach(link => {
                                        const value = link.customdata.value;
                                        const symbol = link.customdata.symbol;
                                        if (link.customdata.receipt !== 'Interquarter') {
                                            switch(symbol) {
                                                case 'ETH':
                                                    ethSumOut += value;
                                                    break;
                                                case 'ENS':
                                                    ensSumOut += value;
                                                    break;
                                                case 'USDC':
                                                    usdcSumOut += value;
                                                    break;
                                            }
                                        } else {
                                            const interString = `${formatValue(value, null, null, true)} ${symbol}`;
                                            switch(symbol) {
                                                case 'ETH':
                                                    ethInterOut += (ethInterOut ? ', ' : '') + interString;
                                                    break;
                                                case 'ENS':
                                                    ensInterOut += (ensInterOut ? ', ' : '') + interString;
                                                    break;
                                                case 'USDC':
                                                    usdcInterOut += (usdcInterOut ? ', ' : '') + interString;
                                                    break;
                                            }
                                        }
                                    });
                                }
                                let ethSumIn = 0, ensSumIn = 0, usdcSumIn = 0;
                                let ethInterIn = '', ensInterIn = '', usdcInterIn = '';
                                if (clickedPoint.targetLinks && clickedPoint.targetLinks.length > 0) {
                                    clickedPoint.targetLinks.forEach(link => {
                                        if (link.customdata.receipt !== 'Interquarter') {
                                            const value = parseFloat(link.customdata.value) || 0;
                                            const symbol = link.customdata.symbol;

                                            switch(symbol) {
                                                case 'ETH':
                                                    ethSumIn += value;
                                                    break;
                                                case 'ENS':
                                                    ensSumIn += value;
                                                    break;
                                                case 'USDC':
                                                    usdcSumIn += value;
                                                    break;
                                            }
                                        } else {
                                            const value = link.customdata.value;
                                            const symbol = link.customdata.symbol;
                                            const interString = `${formatValue(value, null, null, true)} ${symbol}`;
                                            
                                            switch(symbol) {
                                                case 'ETH':
                                                    ethInterIn += (ethInterIn ? ', ' : '') + interString;
                                                    break;
                                                case 'ENS':
                                                    ensInterIn += (ensInterIn ? ', ' : '') + interString;
                                                    break;
                                                case 'USDC':
                                                    usdcInterIn += (usdcInterIn ? ', ' : '') + interString;
                                                    break;
                                            }
                                        }
                                    });
                                }
                                let swaps = [];
                                if (clickedPoint.customdata.swaps && clickedPoint.customdata.swaps.length > 0) {
                                    const swapsByHash = clickedPoint.customdata.swaps.reduce((acc, swap) => {
                                        if (!acc[swap.receipt]) {
                                            acc[swap.receipt] = [];
                                        }
                                        acc[swap.receipt].push(swap);
                                        return acc;
                                    }, {});
                                
                                    swaps = Object.entries(swapsByHash).map(([hash, transactions]) => {
                                        const negativePositions = [];
                                        const positivePositions = [];
                                        
                                        transactions.forEach(tx => {
                                            const formattedValue = Math.abs(tx.value);
                                            const position = `${formattedValue} ${tx.symbol}`;
                                            if (tx.value < 0) {
                                                negativePositions.push(position);
                                            } else {
                                                positivePositions.push(position);
                                            }
                                        });
                                
                                        return [...negativePositions, ...positivePositions, hash];
                                    });
                                }

                                function formatSumIfNonZero(sum, symbol) {
                                    if (sum === 0) return '';
                                    return `${formatValue(sum, null, null, true)} ${symbol}`;
                                }

                                const outInterquarter = [usdcInterOut, ensInterOut, ethInterOut];
                                const inInterquarter = [usdcInterIn, ensInterIn, ethInterIn];

                                const outSums = [
                                    formatSumIfNonZero(usdcSumOut, 'USDC'),
                                    formatSumIfNonZero(ensSumOut, 'ENS'),
                                    formatSumIfNonZero(ethSumOut, 'ETH')
                                ];
                                
                                const inSums = [
                                    formatSumIfNonZero(usdcSumIn, 'USDC'),
                                    formatSumIfNonZero(ensSumIn, 'ENS'),
                                    formatSumIfNonZero(ethSumIn, 'ETH')
                                ];
                                
                                const dropdownQuarter = (clickedPoint.customdata.bpIndex);
                                const dropdownValue = clickedPoint.value;
                                const dropdownSender = clickedPoint.targetLinks[0].customdata.from;
                                showContractorsDropdown(
                                    clickedPoint.label,
                                    isSideMenuExpanded ? (0.225*getWidth + clickedPoint.originalX) : clickedPoint.originalX,
                                    clickedPoint.originalY + 2000*heightCalibration*0.05,
                                    dropdownQuarter,
                                    dropdownValue,
                                    dropdownSender,
                                    { width: layout.width, height: layout.height },
                                    true,
                                    false,
                                    outInterquarter,
                                    inInterquarter,
                                    inSums,
                                    outSums,
                                    swaps
                                );
                            } else {
                                const dropdownQuarter = (clickedPoint.customdata.bpIndex).match(/\((\d{4}Q\d)\)/)[1];
                                const dropdownValue = clickedPoint.value;
                                const dropdownSender = clickedPoint.targetLinks[0].customdata.from;
                                showContractorsDropdown(
                                    clickedPoint.label,
                                    isSideMenuExpanded ? (0.225*getWidth + clickedPoint.originalX) : clickedPoint.originalX,
                                    clickedPoint.originalY + 2000*heightCalibration*0.05,
                                    dropdownQuarter,
                                    dropdownValue,
                                    dropdownSender,
                                    { width: layout.width, height: layout.height }
                                );
                            }
                        } else {                     
                            const dropdownValue = clickedPoint.value;
                            if (specialWallets.includes(clickedPoint.label)) {
                                let ethSumOut = 0, ensSumOut = 0, usdcSumOut = 0;
                                let ethInterOut = '', ensInterOut = '', usdcInterOut = '';
                                if (clickedPoint.sourceLinks && clickedPoint.sourceLinks.length > 0) {
                                    clickedPoint.sourceLinks.forEach(link => {
                                        const value = link.customdata.value;
                                        const symbol = link.customdata.symbol;
                                        if (link.customdata.receipt !== 'Unspent') {
                                            switch(symbol) {
                                                case 'ETH':
                                                    ethSumOut += value;
                                                    break;
                                                case 'ENS':
                                                    ensSumOut += value;
                                                    break;
                                                case 'USDC':
                                                    usdcSumOut += value;
                                                    break;
                                            }
                                        } else {
                                            const interString = `${formatValue(value, null, null, true)} ${symbol}`;
                                            switch(symbol) {
                                                case 'ETH':
                                                    ethInterOut += (ethInterOut ? ', ' : '') + interString;
                                                    break;
                                                case 'ENS':
                                                    ensInterOut += (ensInterOut ? ', ' : '') + interString;
                                                    break;
                                                case 'USDC':
                                                    usdcInterOut += (usdcInterOut ? ', ' : '') + interString;
                                                    break;
                                            }
                                        }
                                    });
                                }
                                let ethSumIn = 0, ensSumIn = 0, usdcSumIn = 0;
                                let ethInterIn = '', ensInterIn = '', usdcInterIn = '';
                                if (clickedPoint.targetLinks && clickedPoint.targetLinks.length > 0) {
                                    clickedPoint.targetLinks.forEach(link => {
                                        if (link.customdata.receipt !== 'Unspent') {
                                            const value = parseFloat(link.customdata.value) || 0;
                                            const symbol = link.customdata.symbol;

                                            switch(symbol) {
                                                case 'ETH':
                                                    ethSumIn += value;
                                                    break;
                                                case 'ENS':
                                                    ensSumIn += value;
                                                    break;
                                                case 'USDC':
                                                    usdcSumIn += value;
                                                    break;
                                            }
                                        } else {
                                            const value = link.customdata.value;
                                            const symbol = link.customdata.symbol;
                                            const interString = `${formatValue(value, null, null, true)} ${symbol}`;
                                            
                                            switch(symbol) {
                                                case 'ETH':
                                                    ethInterIn += (ethInterIn ? ', ' : '') + interString;
                                                    break;
                                                case 'ENS':
                                                    ensInterIn += (ensInterIn ? ', ' : '') + interString;
                                                    break;
                                                case 'USDC':
                                                    usdcInterIn += (usdcInterIn ? ', ' : '') + interString;
                                                    break;
                                            }
                                        }
                                    });
                                }
                                let swaps = [];
                                if (clickedPoint.customdata.swaps && clickedPoint.customdata.swaps.length > 0) {
                                    const swapsByHash = clickedPoint.customdata.swaps.reduce((acc, swap) => {
                                        if (!acc[swap.receipt]) {
                                            acc[swap.receipt] = [];
                                        }
                                        acc[swap.receipt].push(swap);
                                        return acc;
                                    }, {});
                                
                                    swaps = Object.entries(swapsByHash).map(([hash, transactions]) => {
                                        const negativePositions = [];
                                        const positivePositions = [];
                                        
                                        transactions.forEach(tx => {
                                            const formattedValue = Math.abs(tx.value);
                                            const position = `${formattedValue} ${tx.symbol}`;
                                            if (tx.value < 0) {
                                                negativePositions.push(position);
                                            } else {
                                                positivePositions.push(position);
                                            }
                                        });
                                
                                        return [...negativePositions, ...positivePositions, hash];
                                    });
                                }

                                function formatSumIfNonZero(sum, symbol) {
                                    if (sum === 0) return '';
                                    return `${formatValue(sum, null, null, true)} ${symbol}`;
                                }

                                const outInterquarter = [usdcInterOut, ensInterOut, ethInterOut];
                                const inInterquarter = [usdcInterIn, ensInterIn, ethInterIn];

                                const outSums = [
                                    formatSumIfNonZero(usdcSumOut, 'USDC'),
                                    formatSumIfNonZero(ensSumOut, 'ENS'),
                                    formatSumIfNonZero(ethSumOut, 'ETH')
                                ];
                                
                                const inSums = [
                                    formatSumIfNonZero(usdcSumIn, 'USDC'),
                                    formatSumIfNonZero(ensSumIn, 'ENS'),
                                    formatSumIfNonZero(ethSumIn, 'ETH')
                                ];

                                showContractorsDropdown(
                                    clickedPoint.label,
                                    isSideMenuExpanded ? (0.04*getWidth + 0.225*getWidth + clickedPoint.originalX) : clickedPoint.originalX,
                                    clickedPoint.originalY + 150*heightCalibration,
                                    currentQuarter,
                                    dropdownValue,
                                    null,
                                    { width: layout.width, height: layout.height },
                                    true, 
                                    true,
                                    outInterquarter,
                                    inInterquarter,
                                    inSums,
                                    outSums,
                                    swaps
                                );
                            } else {
                                if (clickedPoint.label !== 'Unspent') {
                                    showContractorsDropdown(
                                        clickedPoint.label,
                                        isSideMenuExpanded ? (0.04*getWidth + 0.225*getWidth + clickedPoint.originalX) : clickedPoint.originalX,
                                        clickedPoint.originalY + 150*heightCalibration,
                                        currentQuarter,
                                        dropdownValue,
                                        null,
                                        { width: layout.width, height: layout.height }
                                    );
                                }
                            }
                        }
                    } else {
                        if (clickedPoint.customdata) {
                            const txDetails = clickedPoint.customdata;
                            const txHash = txDetails.receipt;
                
                            if (!openBanners.has(txHash) && txHash !== 'Interquarter' && txHash !== 'Unspent') {
                                const flowInfo = `${txDetails.date}: <b>${txDetails.from}</b> sent ${txDetails.value} ${txDetails.symbol} (${txDetails.usd} USD) to <b>${txDetails.to}</b>`;
                                const etherscanUrl = `${getEtherscanLink(txHash)}`;
                                createFlowBanner(flowInfo, etherscanUrl, txHash);
                            } else if (txHash === 'Interquarter' || txHash === 'Unspent') {
                                const uniqueID = `${txHash}${txDetails.date}${txDetails.from}${txDetails.symbol}`;
                                if (openBanners.has(uniqueID)) {
                                    return shakeBanner(uniqueID);
                                }
                                const flowInfo = `<b>${txDetails.from}</b> had ${txDetails.value} ${txDetails.symbol} unspent in <b>${txDetails.qtr}</b>`;
                                createFlowBanner(flowInfo, false, uniqueID);
                            } else {
                                shakeBanner(txHash);
                            }
                        }
                    }
                });
            });

            const activeSpecialWallets = new Set(data.nodes
                .map(node => node.name)
                .filter(name => specialWallets.includes(name)));
        
            populateWallets(Array.from(activeSpecialWallets));
        
            navigator.updateUrlBar();
        }) 
        .finally(() => {
            updateContextButton();
          });
    };

    const navigator = new LedgerNavigator();

    const initialState = parseUrl();
    navigator.loadState(initialState);
    navigator.updateUrlBar(true);
});