import { navigator } from "../navigator.js";
import { getMonthRange } from "../../services/utils.js";
import { isDesktop, getWidth, getHeight, heightCalibration, widthCalibration, isWideScreen } from "../globalVars.js";
import { getSideMenuState } from "../globalStates.js";

// Plotly Sankey Traces. See more: https://plotly.com/javascript/reference/sankey/
export function createSankeyData(data) {
    return {
        type: "sankey",
        orientation: "h",
        arrangement: "fixed",
        node: {
            pad: data.pad*heightCalibration,
            thickness: navigator.currentView === 'wallet' ? (isDesktop ? 150*widthCalibration : 150) 
            : (navigator.currentView === 'big_picture' ? (isDesktop ? 15*widthCalibration : 15) 
            : (isDesktop ? 100*widthCalibration : 100)),
            line: {
                color: "grey",
                width: navigator.currentView === 'big_picture' ? 1*widthCalibration : 0.5*widthCalibration
            },
            font: {
                family: "satoshi",
                color: "black"
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
}

// Plotly Layout. See more: https://plotly.com/javascript/reference/layout/
export function createLayout(data) {
    let shapes = [];
    let annotations = [];
    const isSideMenuExpanded = getSideMenuState();

    if (navigator.currentView === 'big_picture') {
        const quarterCount = data.conditions.quarterCount;
        const border = 0.01;
        const quarterNumber = (1 - border) / quarterCount;
        let currentYear = 2022;
        let currentQuarterIndex = 2;

        for (let i = 1; i <= quarterCount; i++) {
            const lineX = i * quarterNumber + border;
            const monthRange = getMonthRange(currentQuarterIndex);
            const annotationX = (lineX + border) - quarterNumber;

            shapes.push(
                {
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
                    }
                },
                {
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
                    }
                }
            );

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
        }

        return {
            width: isDesktop 
                ? isWideScreen
                    ? Math.max(600*quarterCount*widthCalibration, 5000) 
                    : Math.max(600*quarterCount*widthCalibration, 5000) 
                : 600*quarterCount,
            height: isDesktop 
                ? isWideScreen 
                    ? Math.max(2600*heightCalibration, 2000) 
                    : Math.max(2000*heightCalibration, 2000) 
                : 2000,
            margin: { 
                l: 0, 
                r: 0, 
                t: isDesktop 
                ? isWideScreen
                    ? 2600*heightCalibration*0.05 
                    : 2000*heightCalibration*0.05 
                : 100, 
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
    } else {
        const currentModel = data.model;
        annotations.push({
            x: 0.9,
            y: 0.9,
            xref: 'paper',
            yref: 'paper',
            font: {
                size: 18,
                color: 'black'
            },
            showarrow: false,
            text: `model: ${currentModel}`,
            xanchor: 'center',
            yanchor: 'middle',
            dragmode: 'none',
        });

        annotations.push({
            x: isDesktop 
                ? navigator.currentView === 'quarter' 
                    ? isSideMenuExpanded ? 1 : 0.985
                    : isSideMenuExpanded ? 1 : 0.985
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
            text: navigator.currentQuarter
                ? `Quarter: ${navigator.currentQuarter} ${navigator.walletFilter ? `Wallet: ${navigator.walletFilter}` : ''}`        
                : navigator.currentYear
                    ? `Year: ${navigator.currentYear} ${navigator.walletFilter? `Wallet: ${navigator.walletFilter}` : ''}`
                    : ``,
            xanchor: 'end',
            yanchor: 'middle',
            dragmode: 'none',
        });

        if (navigator.walletFilter) {
            return {
                width: isDesktop ? (isSideMenuExpanded ? (0.77*getWidth) : getWidth) : 1440,
                height: isDesktop ? (Math.max(900*heightCalibration, 900)) : 900,
                margin: { 
                    l: isDesktop ? (isSideMenuExpanded ? getWidth*0.04 : getWidth*0.01) : 50,
                    r: isDesktop ? getWidth*0.01 : 50, 
                    t: isDesktop ? 150*heightCalibration : 150, 
                    b: isDesktop ? 150*heightCalibration : 150 
                },
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
            return {
                width: isDesktop ? (isSideMenuExpanded ? (0.77*getWidth) : getWidth) : 1440,
                height: isDesktop ? (Math.max(635*heightCalibration, 635)) : 670,
                margin: { 
                    l: isDesktop ? (isSideMenuExpanded ? getWidth*0.04 : getWidth*0.01) : 50,
                    r: isDesktop ? getWidth*0.01 : 50, 
                    t: isDesktop ? 150*heightCalibration : 150, 
                    b: isDesktop ? 150*heightCalibration : 150 
                },
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
    }
}

// Plotly Config. See more: https://plotly.com/javascript/configuration-options/
export function createConfig(isCategory) {
    if (isCategory) return { 
        displayModeBar: false,
        responsive: true
    }
    else return {
        displayModeBar: false,
        responsive: false,
        scrollZoom: false,
        doubleClick: false,
        showTips: false,
        showAxisDragHandles: false,
        showAxisRangeEntryBoxes: false,
        modeBarButtonsToRemove: ['zoom', 'pan', 'select', 'autoScale', 'resetScale'],
    };
}

// Custom modifications of the SVG elements in the diagram, not provided by Plotly. 
// These are needed to have an active canvas larger than the visible area.
export function createLayoutHeightForNonBP(data) {
    let newHeight;
    let highestY;
    let padding;

    switch (navigator.currentView) {
        case 'quarter':
            highestY = data.maxY;
            padding = 50 * heightCalibration;
            newHeight = (highestY * (0.66*getHeight)) + padding;
            break;
        case 'year':
            if (navigator.walletFilter) {
                newHeight = 800 * heightCalibration;
            } else {
                highestY = data.maxY;
                padding = 50 * heightCalibration;
                newHeight = (highestY * (0.5*getHeight)) + padding;
            }
            break;
        case 'wallet':
            newHeight = 800 * heightCalibration;
            break;
    }

    if (newHeight) {
        updateSankeyDimensions(newHeight);
    }
}

function updateSankeyDimensions(newHeight) {
    const sankeyContainer = document.querySelector('.sankey-container');
    const sankeyDiv = document.getElementById('sankeyDiagram');
    const selectNonecontainer = sankeyDiv.querySelector('.user-select-none.svg-container');
    const allSvgs = sankeyDiv.querySelectorAll('svg.main-svg');
    const plotArea = sankeyDiv.querySelector('.plot-container.plotly');
    const clipPath = sankeyDiv.querySelector('clipPath rect');

    selectNonecontainer.style.height = `${newHeight}px`;
    sankeyContainer.style.height = `${newHeight}px`;

    allSvgs.forEach(svg => {
        svg.setAttribute('height', newHeight);
    });

    const currentViewBox = plotArea.getAttribute('viewBox').split(' ');
    currentViewBox[3] = newHeight;
    plotArea.setAttribute('viewBox', currentViewBox.join(' '));

    if (clipPath) {
        clipPath.setAttribute('height', newHeight);
    }
}