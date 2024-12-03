import { navigator, updateChartTypeToggleVisibility, updateContextButton } from "../navigator.js";
import { setQtrReceiversList, setQtrSendersList, setZoneSendersList, setNodeName } from "../globalStates.js";
import { sankeyNodeLabelsAlign, sankeyNodeLabelsAlignCategory, editNodeLabelsCSS, makeNodesAndAnnotationsClickable } from './nodeLabels.js';
import { createLayout, createConfig, createSankeyData, createLayoutHeightForNonBP } from './sankeyLayout.js';
import { createDragOverlay } from './customDragOverlay.js';
import { addAnnotationListener, createUniversalListenerForNodesAndLinks, createCategoryUniversalListener } from './plotlyListeners.js';
import { isDesktop, getWidth, getHeight, heightCalibration, widthCalibration } from "../globalVars.js";
import { getSideMenuState } from "../globalStates.js";
import { updateHideModeVisibility } from "../domEventHandlers.js";

// The main functions for processing data and transforming it into a Sankey diagram.
export const drawSankey = (period, walletFilter, relayout) => {
    if (period) {
        if (period === 'big_picture') {
            navigator.currentView = 'big_picture';
            navigator.hideMode = false;
        } else if (period.includes('Q')) {
            navigator.currentQuarter = period;
            navigator.currentYear = null;
        } else {
            navigator.currentYear = period;
            navigator.currentQuarter = null;
        }
    }
    navigator.walletFilter = walletFilter;

    const sankeyDiv = document.getElementById('sankeyDiagram');
    const sankeyContainer = document.querySelector('.sankey-container');

    updateChartTypeToggleVisibility();
    updateHideModeVisibility();
    
    let url;
    if (navigator.currentView === 'big_picture') {
        url = `/data/big_picture?hideMode=${navigator.hideMode}`;
    } else if (navigator.currentYear) {
        url = walletFilter ? `/data/year/${navigator.currentYear}/${walletFilter}` : `/data/year/${navigator.currentYear}`;
    } else {
        url = walletFilter ? `/data/${navigator.currentQuarter}/${walletFilter}` : `/data/${navigator.currentQuarter}`;
    }

    fetch(url)
    .then(response => response.json())
    .then(data => {
        setZoneSendersList(data.zoneSendersList || []);
        setQtrSendersList(data.qtrSendersList || []);
        setQtrReceiversList(data.qtrReceiversList || []);
        setNodeName(data.nodes.map(node => node.bpIndex));

        const sankeyData = createSankeyData(data);
        const layout = createLayout(data);
        const config = createConfig();
        
        if (navigator.currentView === 'big_picture') {
            if (!relayout) {
                window.scrollTo(0, 0);
                sankeyContainer.scrollTo(0, 0);
            }
        } else {
            sankeyContainer.scrollTo(0, 0);
        };
        
        Plotly.react(sankeyDiv)
        .then(() => {
            sankeyDiv.removeAllListeners('plotly_click');             
            if (navigator.currentView !== 'big_picture') {
                createLayoutHeightForNonBP(data);
            } else {
                if (isDesktop) {
                    sankeyContainer.style.height = '100vh';
                } else {
                    sankeyContainer.style.height = '2000px';
                }
                sankeyDiv.style.height = '100%';
            }
            if (isDesktop) {
                if (navigator.currentView === 'big_picture') {
                    createDragOverlay();
                }
            }
        });

        Plotly.react(sankeyDiv, [sankeyData], layout, config)
        .then(() => {
            sankeyNodeLabelsAlign(navigator.currentView === 'big_picture' ? 'right' : 'center', true);
            sankeyDiv.removeAllListeners('plotly_click');
            makeNodesAndAnnotationsClickable();
            addAnnotationListener();
            editNodeLabelsCSS(data);
            createUniversalListenerForNodesAndLinks(layout);
        });        
        navigator.updateUrlBar();
    }) 
    .finally(() => {
        updateContextButton();
      });
};

export function drawCategorySankey(period, category, isYearly = false) {
    const sankeyDiv = document.getElementById('sankeyDiagram');
    const sankeyContainer = document.querySelector('.sankey-container');
    
    const isSideMenuExpanded = getSideMenuState();

    sankeyContainer.scrollTo(0, 0);
    window.scrollTo(0, 0);
    
    updateChartTypeToggleVisibility();

    const url = isYearly 
        ? `/category-sankey-data/year/${period}/category/${encodeURIComponent(category)}`
        : `/category-sankey-data/quarter/${period}/category/${encodeURIComponent(category)}`;

    fetch(url)
    .then(response => response.json())
    .then(({ data, layout }) => {
        const config = createConfig(true);
  
        Plotly.newPlot(sankeyDiv, data, {
          ...layout,
          width: isDesktop ? (isSideMenuExpanded ? (0.77*getWidth) : getWidth) : 1440,
          height: getHeight,
          font: {
            size: 14 * widthCalibration,
            family: "satoshi"
          },
          margin: { l: 200 * widthCalibration, r: 200 * widthCalibration, b: 100 * heightCalibration, t: 150 * heightCalibration },
          annotations: [{
            x: isSideMenuExpanded ? 1.25 : 1.15,
            y: isDesktop 
                ? 1.15
                : 1.05,
            xref: 'paper',
            yref: 'paper',
            text: `${isYearly ? 'Year:' : 'Quarter:'} ${period}, Category: ${category}`,
            showarrow: false,
            font: {
                size: isDesktop ? 18*widthCalibration : 18,
                color: 'black',
                family: "satoshi"
            },
            xanchor: 'end',
            yanchor: 'middle'
        }]
        }, config)
    .then(() => {
        sankeyNodeLabelsAlignCategory();
        createCategoryUniversalListener(category)
    });
    })
    .catch(error => console.error('Error:', error));
}