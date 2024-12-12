import { navigator } from "../navigator.js";
import { getYear, formatSumIfNonZero, formatValue, getEtherscanLink } from "../../services/utils.js";
import { getWidth, heightCalibration, specialWallets } from "../globalVars.js";
import { getSideMenuState } from "../globalStates.js";
import { hasOpenBanner } from "../globalStates.js";
import { createFlowBanner, shakeBanner } from "../banner/createBanner.js";
import { showContractorsDropdown } from "../dropdown/contractorsDropdown.js";
import { showRecipientDetails } from "../tables/recipientDetails.js";

// This function allows switching between different display modes by clicking on the corresponding annotations.
export function addAnnotationListener() {
    const sankeyDiv = document.getElementById('sankeyDiagram');
    if (navigator.currentView === 'big_picture') {
        sankeyDiv.on('plotly_clickannotation', function(eventData) {
            const clickedQuarter = eventData.annotation.text;
            const quarterIndex = eventData.annotation.quarterIndex;
            const year = getYear(quarterIndex);
            const quarterMap = {'Jan-Mar': 'Q1', 'Apr-Jun': 'Q2', 'Jul-Sep': 'Q3', 'Oct-Dec': 'Q4'};
            const clickedOnQuarter = `${year}${quarterMap[clickedQuarter]}`;

            const clickedYear = eventData.fullAnnotation.text;

            if (clickedOnQuarter.match(/^\d{4}Q\d$/) && clickedOnQuarter !== '2025Q1') {
                navigator.setQuarter(clickedOnQuarter);
            } else if ((clickedYear.match(/^\d{4}$/))) {
                navigator.setYear(clickedYear);
            }
        });
    } else {
        sankeyDiv.on('plotly_click', function(eventData) {
            const clickedPoint = eventData.points[0];
            const quarterLabel = clickedPoint.label;
            if (navigator.currentView === 'quarter') {
                if (quarterLabel.match(/^\d{4}Q\d$/) && !quarterLabel.endsWith('2025Q1')) {
                    navigator.setQuarter(quarterLabel);
                }
            } else if (navigator.currentView === 'wallet') {
                if (quarterLabel.match(/^\d{4}Q\d$/) && !quarterLabel.endsWith('2025Q1')) {
                    navigator.currentQuarter = quarterLabel;
                    navigator.updateDiagram();
                }
            } else if (navigator.currentView === 'year' && quarterLabel !== '2025') {
                if (quarterLabel.match(/^\d{4}$/)) {
                    navigator.currentYear = quarterLabel;
                    navigator.updateDiagram();
                }
            }
        });
    }
}

// This function enables interaction with nodes and links
export function createUniversalListenerForNodesAndLinks(layout) {
    const isSideMenuExpanded = getSideMenuState();
    const sankeyDiv = document.getElementById('sankeyDiagram');
    sankeyDiv.on('plotly_click', function(eventData) {
        const clickedPoint = eventData.points[0];
        console.log(clickedPoint);    
        // clickedPoint.childrenNodes is simply used as a distinguishing feature between a link and a node. 
        // In eventData.points, links do not have the childrenNodes attribute, whereas nodes do. 
        // For nodes, a dropdown is triggered (see more in contractorsDropdown.js), and for links, a banner is triggered (see more in banner.js)
        if (clickedPoint.childrenNodes) {
            const categoryLitIndex = navigator.currentView === 'big_picture' 
                    ? (clickedPoint.customdata.bpIndex).match(/.*?\)/)[0]
                    : navigator.currentView === 'year' 
                        ? (`${clickedPoint.label} (${navigator.currentYear})`)
                        : (`${clickedPoint.label} (${navigator.currentQuarter})`);
                let ethSumOut = 0, ensSumOut = 0, usdcSumOut = 0;
                let ethInterOut = '', ensInterOut = '', usdcInterOut = '';
                if (clickedPoint.sourceLinks && clickedPoint.sourceLinks.length > 0) {
                    clickedPoint.sourceLinks.forEach(link => {
                        const value = link.customdata.value;
                        const symbol = link.customdata.symbol;
                        if (navigator.currentView === 'big_picture' && link.customdata.receipt !== 'Interquarter' || navigator.currentView !== 'big_picture' && link.customdata.receipt !== 'Unspent') {
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
                        if (navigator.currentView === 'big_picture' && link.customdata.receipt !== 'Interquarter' || navigator.currentView !== 'big_picture' && link.customdata.receipt !== 'Unspent') {
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
                
                const dropdownValue = (navigator.currentView !== 'big_picture' && clickedPoint.label === 'Endowment')
                    ? clickedPoint.value*25
                    : clickedPoint.value;
                let dropdownSender;
                if (clickedPoint.targetLinks[0]) {
                    dropdownSender = clickedPoint.targetLinks[0].customdata.from;
                }
                showContractorsDropdown(
                    clickedPoint.label,
                    navigator.currentView === 'big_picture'
                        ? isSideMenuExpanded ? (0.225*getWidth + clickedPoint.originalX) : clickedPoint.originalX
                        : isSideMenuExpanded ? (0.04*getWidth + 0.225*getWidth + clickedPoint.originalX) : clickedPoint.originalX,
                    navigator.currentView === 'big_picture' 
                        ? clickedPoint.originalY + 2000*heightCalibration*0.05
                        : clickedPoint.originalY + 150*heightCalibration,
                    categoryLitIndex,
                    dropdownValue,
                    navigator.currentView === 'big_picture'
                    ? dropdownSender
                    : null,
                    { width: layout.width, height: layout.height },
                    specialWallets.includes(clickedPoint.label) ? true : false, 
                    outInterquarter,
                    inInterquarter,
                    inSums,
                    outSums,
                    swaps
                );
        } else {
            if (clickedPoint.customdata) {
                const txDetails = clickedPoint.customdata;
                const txHash = txDetails.receipt;
                const address = txDetails.addr;
    
                if (!hasOpenBanner(txHash) && txHash !== 'Interquarter' && txHash !== 'Unspent') {
                    const flowInfo = `${txDetails.date}: <b>${txDetails.from}</b> sent ${txDetails.value} ${txDetails.symbol} (${txDetails.usd} USD) to <b>${txDetails.to}</b>`;
                    const etherscanUrl = `${getEtherscanLink(txHash)}`;
                    createFlowBanner(flowInfo, etherscanUrl, txHash, address);
                } else if (txHash === 'Interquarter' || txHash === 'Unspent') {
                    const uniqueID = `${txHash}${txDetails.date}${txDetails.from}${txDetails.symbol}`;
                    if (hasOpenBanner(uniqueID)) {
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
}

export function createCategoryUniversalListener(category) {
    const sankeyDiv = document.getElementById('sankeyDiagram');
    sankeyDiv.on('plotly_click', function(eventData) {
        const clickedPoint = eventData.points[0];
        console.log(clickedPoint);
        const recipientName = clickedPoint.label === category
            ? clickedPoint.label
            : clickedPoint.label.split(' - ')[1];
        const address = clickedPoint.customdata.addr;
        const quarter = clickedPoint.customdata.qtr;
        const txHash = clickedPoint.customdata.receipt;
        
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
                if (hasOpenBanner(txHash)) {
                    shakeBanner(txHash);
                } else {
                    const flowInfo = `${txDetails.date}: <b>${txDetails.from}</b> sent ${txDetails.value} ${txDetails.symbol} (${txDetails.usd} USD) to <b>${txDetails.to}</b>`;
                    const etherscanUrl = txDetails.receipt ? getEtherscanLink(txDetails.receipt) : null;
                    createFlowBanner(flowInfo, etherscanUrl, txHash, address);
                }
            }
        }
    });
}