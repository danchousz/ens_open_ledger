let isSideMenuExpanded = true;
let openBanners = new Set();
let zoneSendersList;
let qtrSendersList;
let qtrReceiversList;
let nodeName;

export function setZoneSendersList(list) {
    zoneSendersList = list;
}

export function getSideMenuState() {
    return isSideMenuExpanded;
}



export function addOpenBanner(bannerId) {
    openBanners.add(bannerId);
}

export function removeOpenBanner(bannerId) {
    openBanners.delete(bannerId);
}

export function hasOpenBanner(bannerId) {
    return openBanners.has(bannerId);
}




export function setQtrSendersList(list) {
    qtrSendersList = list;
}

export function getZoneSendersList() {
    return zoneSendersList;
}



export function setQtrReceiversList(list) {
    qtrReceiversList = list;
}

export function getQtrReceiversList() {
    return qtrReceiversList;
}



export function setNodeName(list) {
    nodeName = list;
}

export function getNodeName() {
    return nodeName;
}



export function setSideMenuState(state) {
    isSideMenuExpanded = state;
}

export function getQtrSendersList() {
    return qtrSendersList;
}