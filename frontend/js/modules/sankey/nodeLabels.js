import { navigator } from '../navigator.js';
import { isDesktop, widthCalibration, specialWallets, daoWallet, registrars } from '../globalVars.js';
import { getZoneSendersList, getNodeName, getQtrSendersList, getQtrReceiversList } from '../globalStates.js';

// Functions that change the font, opacity, and positioning of node labels.
export function sankeyNodeLabelsAlign(position, forcePos) {
    const textAnchor = {left: 'end', right: 'start', center: 'middle'}[position];
    const nodes = document.getElementsByClassName('sankey-node');
    const TEXTPAD = 3;
    const zoneSendersList = getZoneSendersList();
    const nodeName = getNodeName();

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

        if (isSpecialCase && navigator.currentView === 'big_picture') {
            x = -posX - padX;
            label.setAttribute('text-anchor', 'end');
            label.setAttribute('opacity', '0.6', 'important');
        } else if (isSpecialWallet && navigator.currentView === 'big_picture') {
            x = (d.nodeLineWidth + d.visibleWidth) / 2 + (d.left ? padX : -posX);
            label.setAttribute('text-anchor', 'middle');
        } else if (registrarsCase && navigator.currentView === 'big_picture') {
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

export function sankeyNodeLabelsAlignCategory() {
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

export function editNodeLabelsCSS(data) {
    const qtrSendersList = getQtrSendersList();
    const qtrReceiversList = getQtrReceiversList();
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
    if ((navigator.currentView !== 'big_picture' || !navigator.currentView !== 'wallet')) {
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
}

export function makeNodesAndAnnotationsClickable() {
    const sankeyDiv = document.getElementById('sankeyDiagram');
    
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
}