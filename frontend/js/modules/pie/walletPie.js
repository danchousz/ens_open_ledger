import { getWidth, heightCalibration, widthCalibration, isDesktop } from "../globalVars.js";
import { getSideMenuState } from "../globalStates.js";
import { navigator } from "../navigator.js";

let collapseButtonListener = null;

// Using a Plotly Pie Chart here because it does not conflict with the Sankey chart when they exist in the same container.
function createPieChartLayout(isSideMenuExpanded, period, wallet, isYear, isCategory) {
    return {
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
            x: 0.9,
            y: 0.75,
            xanchor: 'left',
            yanchor: 'middle',
            orientation: 'vertical',
            font: {
                size: 14*widthCalibration,
                family: "satoshi"
            }
        },
        annotations: [{
            x: isSideMenuExpanded ? 1.03 : 0.99,
            y: isDesktop 
                ? navigator.currentView === 'quarter' ? 1.25 : 1.15
                : 1.05,
            xref: 'paper',
            yref: 'paper',
            text: `${isYear ? 'Year:' : 'Quarter:'} ${period}, ${isCategory ? 'Category:' : 'Wallet:'} ${wallet}`,
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
}

export function drawWalletPieChart(period, wallet, isYear) {
    const sankeyDiv = document.getElementById('sankeyDiagram');
    if (!sankeyDiv) {
        console.error("Sankey diagram container not found");
        return;
    }

    removeCollapseButtonListener();
    
    let url = isYear ? `/data/year/${period}/${wallet}` : `/data/${period}/${wallet}`;
    
    fetch(url)
    .then(response => response.json())
    .then(data => {
        const pieData = processSankeyDataForPieChart(data, wallet);
    
        let isSideMenuExpanded = getSideMenuState();
        let layout = createPieChartLayout(isSideMenuExpanded, period, wallet, isYear);

        let filteredData = pieData.labels.reduce((acc, label, index) => {
            if (label !== 'DAO Wallet' && !label.match(/^\d{4}$/) && !label.match(/^\d{4}Q\d$/) && label !== 'Plchld') {
                acc.labels.push(label);
                acc.values.push(pieData.values[index]);
            }
            return acc;
        }, { labels: [], values: [] });

        const pieChart = {
            type: 'pie',
            labels: filteredData.labels,
            values: filteredData.values,
            textinfo: 'percent',
            insidetextorientation: 'radial',
            hoverinfo: 'label+percent+value',
            textfont: {
                size: 14*widthCalibration,
                family: "satoshi"
            }
        };
        
        Plotly.newPlot(sankeyDiv, [pieChart], layout, {displayModeBar: false});

        const collapseButton = document.getElementById('collapseButton');
    
        collapseButtonListener = function() {
            isSideMenuExpanded = getSideMenuState();
            layout = createPieChartLayout(isSideMenuExpanded, period, wallet, isYear);
            Plotly.relayout(sankeyDiv, layout);
        };

        collapseButton.addEventListener('click', collapseButtonListener);
    })
    .catch(error => console.error("Error drawing wallet pie chart:", error));
}
    
export function drawCategoryPieChart(period, category, isYear) {
    const sankeyDiv = document.getElementById('sankeyDiagram');
    if (!sankeyDiv) {
        console.error("Sankey diagram container not found");
        return;
    }

    removeCollapseButtonListener();

    let url;
    if (isYear) {
        url = `/category-sankey-data/year/${period}/category/${encodeURIComponent(category)}`;
    } else {
        url = `/category-sankey-data/quarter/${period}/category/${encodeURIComponent(category)}`;
    }
    
    fetch(url)
        .then(response => response.json())
        .then(({ data }) => {
        const pieData = processSankeyDataForPieChart(data[0]);
        let isSideMenuExpanded = getSideMenuState();
        
        let layout = createPieChartLayout(isSideMenuExpanded, period, category, isYear, true)
    
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

        const collapseButton = document.getElementById('collapseButton');
    
        collapseButtonListener = function() {
            isSideMenuExpanded = getSideMenuState();
            layout = createPieChartLayout(isSideMenuExpanded, period, category, isYear, true);
            Plotly.relayout(sankeyDiv, layout);
        };
        collapseButton.addEventListener('click', collapseButtonListener);
        
        })
        .catch(error => console.error("Error drawing category pie chart:", error));
    }
    
function processSankeyDataForPieChart(sankeyData, walletFilter = null) {
    const values = [];
    const labels = [];
    
    if (navigator.currentView === 'wallet') {
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

function removeCollapseButtonListener() {
    if (collapseButtonListener) {
        const collapseButton = document.getElementById('collapseButton');
        collapseButton.removeEventListener('click', collapseButtonListener);
        collapseButtonListener = null;
    }
}

export function exitPieChart() {
    removeCollapseButtonListener();
}