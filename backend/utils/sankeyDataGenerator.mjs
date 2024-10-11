export function getNextQuarter(quarter) {
    const [year, q] = quarter.split('Q');
    const nextQ = parseInt(q) % 4 + 1;
    const nextYear = nextQ === 1 ? parseInt(year) + 1 : year;
    return `${nextYear}Q${nextQ}`;
}

export function getLastQuarter(df) {
    return df.reduce((max, row) => {
        return row.Quarter > max ? row.Quarter : max;
    }, '');
}

export function countUniqueQuarters(dataFrame) {
    const uniqueQuarters = new Set();
    dataFrame.forEach(row => {
        uniqueQuarters.add(row.Quarter);
    });
    return uniqueQuarters.size;
}

export function createSankeyData(df, bigPicture = false, quarter = null, walletFilter, isYear, hideMode = true) {
    
    console.log('Creating Sankey data:', { bigPicture, quarter, walletFilter, hideMode });

    const specialWallets = {
        'Ecosystem': 0.9,
        'Public Goods': 0.9,
        'Metagov': 0.9,
        'Community WG': 0.9,
        'Providers': 0.9
    };
    const colorMap = {
        'USDC': '#5294e2',
        'ETH': '#b97cf3',
        'ENS': '#5ac8fa'
    };
    const colorHideModeMap = {
        'USDC': '#5294e233',
        'ETH' : '#b97cf333',
        'ENS': '#5ac8fa33'
    }

    // Main lists to fill .sankeyData and .layout data for Plotly
    // To learn more: https://plotly.com/javascript/reference/sankey/
    let nodes = [];
    let nodeIndices = {};
    let linkSources = [];
    let linkTargets = [];
    let linkReceipts = [];
    let linkValues = [];
    let linkColors = [];
    let linkLabels = [];
    let nodeCustomdata = [];
    let nodeColors = [];
    let nodeX = [];
    let nodeY = [];
    let pad = 0;

    // node.customData
    let categoryToNames = {};        // list of receipients within category
    let nodeSwapInfo = {};           // list of swaps conducted by WG wallet within a quarter
    let safeYAxisExport = [];        // list to export all Y-coordinates. Used to determine the lowest point of the chart to determine the height of the layout
    let nodeSenderSafeExport = [];   

    // link.customData
    // All here is used for pop-up banners with transaction details when clicking on the flow.
    let linkCustomDataDate = [];
    let linkCustomDataValue = [];
    let linkCustomDataSymbol = [];
    let linkCustomDataUSD = [];
    let linkCustomDataTo = [];
    let linkCustomDataFrom = [];
    let linkCustomDataQtr = [];
    let linkCustomDataAddr = [];

    // Variables for dividing into quarters in Big Picture mode
    let quarterCount = countUniqueQuarters(df);
    let border = 0.01;
    let quarterNumber = (1 - border) / quarterCount;

    // Variables for positioning nodes

    // In big picture:
        let startPoint = 0;
        // For catergory mode
        let registrarZone = 0.075;

        let daoWalletZone = 0.125;
        let daoWalletZoneRecipientsCat = 0;

        let ecosystemZone = 0.35;
        let ecosystemZoneRecipientsCat, ecosystemZoneSendersCat = ecosystemZone;
        let zoneSendersList = [];

        let publicGoodsZone = 0.58;
        let publicGoodsZoneRecipientsCat, publicGoodsZoneSendersCat = publicGoodsZone;

        let metagovZone = 0.75;
        let metagovZoneRecipientCat, metagovZoneSendersCat = metagovZone;

        let communityWGZone = 0.88;
        let communityWGZoneRecipientsCat = communityWGZone;

        let spsZone = 0.92;
        let spsZoneRecipientsCat, spsZoneSendersCat = spsZone;
        // For detailed mode (obsolete, deleted)

    // In quarterly display:
        let daoWalletY = 0.2;
        let daoWalletX = 0.05;
        let lastDaoWalletY = daoWalletY;

        let lastX = 0.95;
        let specialWalletsX = 0.45;
        let daoWalletRecipients = [];

        let lastEcosystemY = 0;
        let ecosystemRecipients = [];
        let ecosystemSenders = [];
        let lastEcosystemSenderY = daoWalletY + 0.2;

        let lastPublicGoodsY = 0;
        let publicGoodsRecipients = [];
        let publicGoodsSenders = [];
        let lastPublicGoodsSenderY = lastEcosystemSenderY + 0.2;

        let lastMetagovY = 0;
        let metagovRecipients = [];
        let metagovSenders = [];
        let lastMetagovSenderY = lastPublicGoodsSenderY + 0.2; 

        let lastCommunityWGY = 0;
        let communityWGRecipients = [];
        let communityWGSenders = [];
        let lastCommunityWGSenderY = lastMetagovSenderY + 0.2;

        let lastSpsY = 0;
        let spsRecipients = [];
        let spsSenders = [];
        let lastSpsSenderY = lastMetagovSenderY + 0.2;

        let qtrSendersList = [];
        let qtrReceiversList = [];

    // Flags
    let interCatFlag = false;
    let interSenderFlag = false;
    let interSenderEcoFlag = false;
    let interSenderPGFlag = false;
    let interSenderMGFlag = false;
    let senderFlag = false;
    
    // Auxiliary Variables
    let daoWalletRecipientsSet = new Set();
    let specialWalletSenders = new Set();
    let specialWalletTransactions = [];
    let dummyNodeXY = -10000;
    let unspentNodes = new Set();

    // For model assigner
    let condition1 = false;
    let condition2 = false;
    let condition3 = false;
    let innerTransfers = false;

    // Condition checker for model assigner
    df.forEach(row => {
        if (quarter && row['Transaction Hash'] === 'Interquarter') {
            return;
        }

        const sender = row.From_name;
        const receiver = row.To_name;

        if (sender === 'DAO Wallet') {
            if (!specialWallets.hasOwnProperty(receiver)) {
                if (walletFilter) {
                    condition1 = false;
                } else {
                    condition1 = true;
                } daoWalletRecipientsSet.add(receiver);
            } else {
                if (walletFilter) {
                    condition1 = false;
                } else {
                    condition2 = true;
                } daoWalletRecipientsSet.add(receiver);
            }
        }

        if (specialWallets.hasOwnProperty(receiver) && sender !== 'DAO Wallet') {
            specialWalletSenders.add(sender);
            specialWalletTransactions.push({ sender, receiver });
        }

    });

    specialWalletTransactions.forEach(({ sender, receiver }) => {
        if (specialWallets.hasOwnProperty(sender) && specialWallets.hasOwnProperty(receiver)) {
            condition3 = false;
            innerTransfers = true;
        } else if (specialWallets.hasOwnProperty(sender) && specialWallets.hasOwnProperty(receiver)) {
            condition3 = false;
        } else {
            condition3 = true;
        }
    });

    console.log(isYear)

    // Model assigner
    let model;
    if (isYear) {
        if (!walletFilter)
            model = 'year';
        else {
            model = 'detailed';
        }
    } else {
        if (condition1 && condition2 && !condition3) {
            model = 1;
        } else if (condition1 && !condition2 && !condition3) {
            model = 2;
        } else if (condition2 && condition3 && !condition1) {
            model = 3;
        } else if (condition1 && condition3 && !condition2) {
            model = 4;
        } else if (condition1 && condition2 && condition3) {
            model = (quarter === '2022Q3') ? 'dissolution' : 5;
        } else if (walletFilter) {
            model = 'detailed';
        } else {
            model = 'NaN'
        }
    }

    // Assigning positions to nodes;
    // The assignment is based on the enabled display modes, models, and node names;
    // These complex structures can and should be simplified in the future;
    // But at the moment they are quite detailed so that I can remain flexible.
    // The algorithm is only valid for the current data structure (see ledger.csv) generated by merger.py.
    const getNodeIndex = (nodeName, sender, receiver, model, quarter = null) => {
        const specialWallets = ['Ecosystem', 'Public Goods', 'Metagov', 'Community WG', 'Providers'];
        if (bigPicture) {
            if ((sender.startsWith('Community WG') && receiver.startsWith('Dissolution')) 
                || (receiver.endsWith('Swap') || sender.endsWith('Swap'))
                || (receiver === 'CoW' || sender === 'CoW')
                || (receiver.startsWith('Community WG') && sender.startsWith('Community WG'))
                ) { return -1; }
            if (!nodeIndices[nodeName]) {
                nodeIndices[nodeName] = nodes.length;
                nodes.push(nodeName);
                pad = 1;
                if (nodeName.startsWith('DAO Wallet')) {
                    nodeColors.push('rgba(0, 0, 0, 0)')
                }
                if (!hideMode) {
                    registrarZone = 0.065;
                    daoWalletZone = 0.2;
                    ecosystemZone = 0.45;
                    publicGoodsZone = 0.64;
                    metagovZone = 0.78;
                    communityWGZone = 0.9;
                    spsZone = 0.9;
                    if (nodeName.startsWith('Registrar')) {
                        nodeX.push(registrarZone)
                    }
                 }
                if (nodeName.includes('2022Q2')) {
                    startPoint = quarterNumber*1 - quarterNumber + border
                    if (nodeName.includes('Registrar')) {
                        nodeX.push(startPoint - quarterNumber + 2.5*border)
                        nodeY.push(registrarZone)
                    }
                    if (nodeName.startsWith('DAO Wallet')) {
                        nodeX.push(startPoint);
                        nodeY.push(daoWalletZone);
                        interCatFlag = true;
                        daoWalletZoneRecipientsCat = daoWalletZone;
                        communityWGZoneRecipientsCat = communityWGZone;
                    } else if (nodeName.startsWith('Community WG')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(communityWGZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('DAO Wallet')) {
                        if (interCatFlag) {
                            if (hideMode) {
                                daoWalletZoneRecipientsCat += 0.025;
                            } else {
                                daoWalletZoneRecipientsCat += 0.14;
                            }
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.03);
                        } else {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.01);
                        }
                        ecosystemZoneRecipientsCat = ecosystemZone;
                        ecosystemZoneSendersCat = ecosystemZone;
                    } else if (nodeName.startsWith('Ecosystem')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));
                        nodeY.push(ecosystemZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Ecosystem')) {
                        if (interCatFlag) {
                            ecosystemZoneRecipientsCat += 0.03;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.01);
                        }
                        publicGoodsZoneRecipientsCat = publicGoodsZone;
                    } else if (nodeName.startsWith('Public Goods')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(publicGoodsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Public Goods')) {
                        if (interCatFlag) {
                            publicGoodsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.01);
                        }
                        metagovZoneRecipientCat = metagovZone;
                        metagovZoneSendersCat = metagovZone;
                        interSenderFlag = true;
                    } else if (nodeName.startsWith('Metagov')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(metagovZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Metagov')) {
                        if (interCatFlag) {
                            metagovZoneRecipientCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(metagovZoneRecipientCat += 0.0125);
                        } else {
                            nodeY.push(metagovZoneRecipientCat += 0.01);
                        }
                        interSenderFlag = true;
                    } else if (sender.startsWith('Community WG')) {
                        if (interCatFlag) {
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        nodeY.push(communityWGZoneRecipientsCat += 0.01);
                    }
                
                } else if (nodeName.includes('2022Q3')) {
                    startPoint = quarterNumber*2 - quarterNumber + border;
                    if (nodeName.includes('Registrar')) {
                        nodeX.push(startPoint - quarterNumber + 2.5*border)
                        nodeY.push(registrarZone)
                    }
                    if (nodeName.startsWith('DAO Wallet')) {
                        nodeX.push(startPoint);
                        nodeY.push(daoWalletZone);
                        interCatFlag = true;
                        daoWalletZoneRecipientsCat = daoWalletZone;
                    } else if (sender.startsWith('DAO Wallet')) {
                        if (interCatFlag) {
                            if (hideMode) {
                                daoWalletZoneRecipientsCat += 0.025;
                            } else {
                                daoWalletZoneRecipientsCat += 0.14;
                            }
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.03);
                        } else {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.01);
                        }
                        ecosystemZoneRecipientsCat = ecosystemZone;
                        ecosystemZoneSendersCat = ecosystemZone;
                    } else if (nodeName.startsWith('Dissolution')) {

                        nodeX.push(startPoint - quarterNumber/1.5);;
                        nodeY.push(communityWGZone);
                        interCatFlag = true;
                    } else if (nodeName.startsWith('Ecosystem')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));
                        nodeY.push(ecosystemZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Ecosystem')) {
                        if (interCatFlag) {
                            ecosystemZoneRecipientsCat += 0.03;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.01);
                        }
                        publicGoodsZoneRecipientsCat = publicGoodsZone;
                        interSenderEcoFlag = true;
                    } else if (receiver.startsWith('Ecosystem') && !sender.startsWith('Community WG')) {
                        if (interSenderEcoFlag) {
                            ecosystemZoneSendersCat -= 0.075
                            interSenderEcoFlag = false;
                        }
                        nodeX.push(quarterNumber*3 - quarterNumber + border);
                        nodeY.push(ecosystemZoneSendersCat += 0.015)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Public Goods')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(publicGoodsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Public Goods')) {
                        if (interCatFlag) {
                            publicGoodsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.01);
                        }
                        metagovZoneRecipientCat = metagovZone;
                        metagovZoneSendersCat = metagovZone;
                        interSenderFlag = true;
                    } else if (nodeName.startsWith('Metagov')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(metagovZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Metagov')) {
                        if (interCatFlag) {
                            metagovZoneRecipientCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(metagovZoneRecipientCat += 0.0125);
                        } else {
                            nodeY.push(metagovZoneRecipientCat += 0.01);
                        }
                        interSenderFlag = true;
                    } else if (sender.startsWith('Community WG')) {
                        if (interCatFlag) {
                            communityWGZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        nodeY.push(communityWGZoneRecipientsCat += 0.01);
                    }
                
                } else if (nodeName.includes('2022Q4')) {
                startPoint = quarterNumber*3 - quarterNumber + border;
                    if (nodeName.includes('Registrar')) {
                        nodeX.push(startPoint - quarterNumber + 2.5*border)
                        nodeY.push(registrarZone)
                    }
                    if (nodeName.startsWith('DAO Wallet')) {
                        nodeX.push(startPoint);
                        nodeY.push(daoWalletZone);
                        interCatFlag = true;
                        daoWalletZoneRecipientsCat = daoWalletZone;
                    } else if (sender.startsWith('DAO Wallet')) {
                        if (interCatFlag) {
                            if (hideMode) {
                                daoWalletZoneRecipientsCat += 0.025;
                            } else {
                                daoWalletZoneRecipientsCat += 0.14;
                            }
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.03);
                        } else {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.01);
                        }
                        ecosystemZoneRecipientsCat = ecosystemZone;
                        ecosystemZoneSendersCat = ecosystemZone;
                    } else if (nodeName.startsWith('Ecosystem')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));
                        nodeY.push(ecosystemZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Ecosystem')) {
                        if (interCatFlag) {
                            ecosystemZoneRecipientsCat += 0.03;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.01);
                        }
                        publicGoodsZoneRecipientsCat = publicGoodsZone;
                    } else if (receiver.startsWith('Ecosystem')) {
                        if (interSenderFlag) {
                            if (hideMode) {
                                ecosystemZoneSendersCat += 0.035;
                            } else {
                                ecosystemZoneSendersCat += 0.025
                            }
                            interSenderFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(ecosystemZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Public Goods')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(publicGoodsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Public Goods')) {
                        if (interCatFlag) {
                            publicGoodsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.01);
                        }
                        metagovZoneRecipientCat = metagovZone;
                        metagovZoneSendersCat = metagovZone;
                        interSenderFlag = true;
                    } else if (nodeName.startsWith('Metagov')) {
                        nodeX.push(startPoint + (quarterNumber/4));;
                        nodeY.push(metagovZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Metagov')) {
                        if (interCatFlag) {
                            metagovZoneRecipientCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(metagovZoneRecipientCat += 0.0125);
                        } else {
                            nodeY.push(metagovZoneRecipientCat += 0.01);
                        }
                        interSenderFlag = true;
                    }
                
                } else if (nodeName.includes('2023Q1')) {
                    startPoint = quarterNumber*4 - quarterNumber + border;
                    if (nodeName.includes('Registrar')) {
                        nodeX.push(startPoint - quarterNumber + 2.5*border)
                        nodeY.push(registrarZone)
                    }
                    if (nodeName.startsWith('DAO Wallet')) {
                        nodeX.push(startPoint);
                        nodeY.push(daoWalletZone);
                        interCatFlag = true;
                        daoWalletZoneRecipientsCat = daoWalletZone;
                    } else if (sender.startsWith('DAO Wallet')) {
                        if (interCatFlag) {
                            if (hideMode) {
                                daoWalletZoneRecipientsCat += 0.025;
                            } else {
                                daoWalletZoneRecipientsCat += 0.14;
                            }
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.03);
                        } else {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.01);
                        }
                        ecosystemZoneRecipientsCat = ecosystemZone;
                        ecosystemZoneSendersCat = ecosystemZone;
                    } else if (nodeName.startsWith('Ecosystem')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));
                        nodeY.push(ecosystemZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Ecosystem')) {
                        if (interCatFlag) {
                            ecosystemZoneRecipientsCat += 0.03;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.01);
                        }
                        publicGoodsZoneRecipientsCat = publicGoodsZone;
                        interSenderEcoFlag = true;
                    } else if (receiver.startsWith('Ecosystem')) {
                        if (interSenderEcoFlag) {
                            if (hideMode) {
                                ecosystemZoneSendersCat -= 0.1
                            } else {
                                ecosystemZoneSendersCat -= 0.075
                            }
                            interSenderEcoFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(ecosystemZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Public Goods')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));
                        nodeY.push(publicGoodsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Public Goods')) {
                        if (interCatFlag) {
                            publicGoodsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.01);
                        }
                        metagovZoneRecipientCat = metagovZone;
                        metagovZoneSendersCat = metagovZone;
                        interSenderFlag = true;
                    } else if (receiver.startsWith('Public Goods')) {
                        if (interSenderFlag) {
                            publicGoodsZoneSendersCat -= 0.004
                            interSenderFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(publicGoodsZoneSendersCat += 0.005)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Metagov')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(metagovZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Metagov')) {
                        if (interCatFlag) {
                            metagovZoneRecipientCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(metagovZoneRecipientCat += 0.0125);
                        } else {
                            nodeY.push(metagovZoneRecipientCat += 0.01);
                        }
                        interSenderMGFlag = true;
                    } else if (receiver.startsWith('Metagov')) {
                        if (interSenderMGFlag) {
                            metagovZoneSendersCat -= 0.06
                            interSenderMGFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(metagovZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);
                    }                 
                } else if (nodeName.includes('2023Q2')) {
                    startPoint = quarterNumber*5 - quarterNumber + border;
                    if (nodeName.includes('Registrar')) {
                        nodeX.push(startPoint - quarterNumber + 2.5*border)
                        nodeY.push(registrarZone)
                    }
                    if (nodeName.startsWith('DAO Wallet')) {
                        nodeX.push(startPoint);
                        nodeY.push(daoWalletZone);
                        interCatFlag = true;
                        daoWalletZoneRecipientsCat = daoWalletZone;
                        ecosystemZoneRecipientsCat = ecosystemZone;
                    } else if (sender.startsWith('DAO Wallet')) {
                        if (interCatFlag) {
                            if (hideMode) {
                                daoWalletZoneRecipientsCat += 0.025;
                            } else {
                                daoWalletZoneRecipientsCat += 0.14;
                            }
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.03);
                        } else {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.01);
                        }
                        ecosystemZoneRecipientsCat = ecosystemZone;
                        ecosystemZoneSendersCat = ecosystemZone;
                    } else if (nodeName.startsWith('Ecosystem')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));
                        nodeY.push(ecosystemZone);
                        interCatFlag = true;
                        ecosystemZoneSendersCat = ecosystemZone + 0.005;
                    } else if (sender.startsWith('Ecosystem')) {
                        if (interCatFlag) {
                            ecosystemZoneRecipientsCat += 0.03;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.01);
                        }
                        publicGoodsZoneRecipientsCat = publicGoodsZone;
                        interSenderEcoFlag = true;
                    } else if (receiver.startsWith('Ecosystem')) {
                        if (interSenderEcoFlag) {
                            if (hideMode) {
                                ecosystemZoneSendersCat -= 0.1
                            } else {
                                ecosystemZoneSendersCat -= 0.075
                            }
                            interSenderEcoFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(ecosystemZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Public Goods')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(publicGoodsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Public Goods')) {
                        if (interCatFlag) {
                            publicGoodsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.01);
                        }
                        metagovZoneRecipientCat = metagovZone;
                        metagovZoneSendersCat = metagovZone;
                        interSenderFlag = true;
                    } else if (receiver.startsWith('Public Goods')) {
                        if (interSenderFlag) {
                            publicGoodsZoneSendersCat -= 0.004
                            interSenderFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(publicGoodsZoneSendersCat += 0.005)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Metagov')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(metagovZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Metagov')) {
                        if (interCatFlag) {
                            metagovZoneRecipientCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(metagovZoneRecipientCat += 0.0125);
                        } else {
                            nodeY.push(metagovZoneRecipientCat += 0.01);
                        }
                        interSenderMGFlag = true;
                    } else if (receiver.startsWith('Metagov')) {
                        if (interSenderMGFlag) {
                            metagovZoneSendersCat -= 0.06
                            interSenderMGFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(metagovZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);
                    }
                
                } else if (nodeName.includes('2023Q3')) {
                    startPoint = quarterNumber*6 - quarterNumber + border;
                    if (nodeName.includes('Registrar')) {
                        nodeX.push(startPoint - quarterNumber + 2.5*border)
                        nodeY.push(registrarZone)
                    }
                    if (nodeName.startsWith('DAO Wallet')) {
                        nodeX.push(startPoint);
                        nodeY.push(daoWalletZone);
                        interCatFlag = true;
                        daoWalletZoneRecipientsCat = daoWalletZone;
                    } else if (sender.startsWith('DAO Wallet')) {
                        if (interCatFlag) {
                            if (hideMode) {
                                daoWalletZoneRecipientsCat += 0.025;
                            } else {
                                daoWalletZoneRecipientsCat += 0.14;
                            }
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.03);
                        } else {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.01);
                        }
                        ecosystemZoneRecipientsCat = ecosystemZone;
                        ecosystemZoneSendersCat = ecosystemZone;
                    } else if (nodeName.startsWith('Ecosystem')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));
                        nodeY.push(ecosystemZone);
                        interCatFlag = true;
                        ecosystemZoneSendersCat = ecosystemZone + 0.005;
                    } else if (sender.startsWith('Ecosystem')) {
                        if (interCatFlag) {
                            ecosystemZoneRecipientsCat += 0.03;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.01);
                        }
                        publicGoodsZoneRecipientsCat = publicGoodsZone;
                        interSenderEcoFlag = true;
                    } else if (receiver.startsWith('Ecosystem')) {
                        if (interSenderEcoFlag) {
                            if (hideMode) {
                                ecosystemZoneSendersCat -= 0.1
                            } else {
                                ecosystemZoneSendersCat -= 0.075
                            }
                            interSenderEcoFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(ecosystemZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Public Goods')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(publicGoodsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Public Goods')) {
                        if (interCatFlag) {
                            publicGoodsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.01);
                        }
                        metagovZoneRecipientCat = metagovZone;
                        metagovZoneSendersCat = metagovZone;
                        interSenderFlag = true;
                    } else if (receiver.startsWith('Public Goods')) {
                        if (interSenderFlag) {
                            publicGoodsZoneSendersCat -= 0.004
                            interSenderFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(publicGoodsZoneSendersCat += 0.005)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Metagov')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(metagovZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Metagov')) {
                        if (interCatFlag) {
                            metagovZoneRecipientCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(metagovZoneRecipientCat += 0.0125);
                        } else {
                            nodeY.push(metagovZoneRecipientCat += 0.01);
                        }
                        interSenderMGFlag = true;
                    } else if (receiver.startsWith('Metagov')) {
                        if (interSenderMGFlag) {
                            metagovZoneSendersCat -= 0.06
                            interSenderMGFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(metagovZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);
                    }       
                
                } else if (nodeName.includes('2023Q4')) {
                    startPoint = quarterNumber*7 - quarterNumber + border;
                    if (nodeName.includes('Registrar')) {
                        nodeX.push(startPoint - quarterNumber + 2.5*border)
                        nodeY.push(registrarZone)
                    }
                    if (nodeName.startsWith('DAO Wallet')) {
                        nodeX.push(startPoint);
                        nodeY.push(daoWalletZone);
                        interCatFlag = true;
                        daoWalletZoneRecipientsCat = daoWalletZone;
                    } else if (sender.startsWith('DAO Wallet')) {
                        if (interCatFlag) {
                            if (hideMode) {
                                daoWalletZoneRecipientsCat += 0.025;
                            } else {
                                daoWalletZoneRecipientsCat += 0.125;
                            }
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.025);
                        } else {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.03);
                        }
                        ecosystemZoneRecipientsCat = ecosystemZone;
                        ecosystemZoneSendersCat = ecosystemZone;
                    } else if (nodeName.startsWith('Ecosystem')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));
                        nodeY.push(ecosystemZone);
                        interCatFlag = true;
                        ecosystemZoneSendersCat = ecosystemZone + 0.005;
                    } else if (sender.startsWith('Ecosystem')) {
                        if (interCatFlag) {
                            ecosystemZoneRecipientsCat += 0.03;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.01);
                        }
                        publicGoodsZoneRecipientsCat = publicGoodsZone;
                        interSenderEcoFlag = true;
                    } else if (receiver.startsWith('Ecosystem')) {
                        if (interSenderEcoFlag) {
                            if (hideMode) {
                                ecosystemZoneSendersCat -= 0.1
                            } else {
                                ecosystemZoneSendersCat -= 0.075
                            }
                            interSenderEcoFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(ecosystemZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Public Goods')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(publicGoodsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Public Goods')) {
                        if (interCatFlag) {
                            publicGoodsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.01);
                        }
                        metagovZoneRecipientCat = metagovZone;
                        metagovZoneSendersCat = metagovZone;
                        interSenderFlag = true;
                    } else if (receiver.startsWith('Public Goods')) {
                        if (interSenderFlag) {
                            publicGoodsZoneSendersCat -= 0.004
                            interSenderFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(publicGoodsZoneSendersCat += 0.005)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Metagov')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(metagovZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Metagov')) {
                        if (interCatFlag) {
                            metagovZoneRecipientCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(metagovZoneRecipientCat += 0.0125);
                        } else {
                            nodeY.push(metagovZoneRecipientCat += 0.01);
                        }
                        interSenderMGFlag = true;
                    } else if (receiver.startsWith('Metagov')) {
                        if (interSenderMGFlag) {
                            metagovZoneSendersCat -= 0.06
                            interSenderMGFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(metagovZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);
                    }       
                
                } else if (nodeName.includes('2024Q1')) {
                    startPoint = quarterNumber*8 - quarterNumber + border;
                    if (nodeName.includes('Registrar')) {
                        nodeX.push(startPoint - quarterNumber + 2.5*border)
                        nodeY.push(registrarZone)
                    }
                    if (nodeName.startsWith('DAO Wallet')) {
                        nodeX.push(startPoint);
                        nodeY.push(daoWalletZone);
                        interCatFlag = true;
                        daoWalletZoneRecipientsCat = daoWalletZone;
                    } else if (sender.startsWith('DAO Wallet')) {
                        if (interCatFlag) {
                            if (hideMode) {
                                daoWalletZoneRecipientsCat += 0.025;
                            } else {
                                daoWalletZoneRecipientsCat += 0.14;
                            }
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.03);
                        } else {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.01);
                        }
                        ecosystemZoneRecipientsCat = ecosystemZone;
                        ecosystemZoneSendersCat = ecosystemZone;
                    } else if (nodeName.startsWith('Ecosystem')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));
                        nodeY.push(ecosystemZone);
                        interCatFlag = true;
                        ecosystemZoneSendersCat = ecosystemZone + 0.03;
                    } else if (sender.startsWith('Ecosystem')) {
                        if (interCatFlag) {
                            ecosystemZoneRecipientsCat += 0.03;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.01);
                        }
                        publicGoodsZoneRecipientsCat = publicGoodsZone;
                        interSenderEcoFlag = true;
                    } else if (receiver.startsWith('Ecosystem')) {
                        if (interSenderEcoFlag) {
                            if (hideMode) {
                                ecosystemZoneSendersCat -= 0.1
                            } else {
                                ecosystemZoneSendersCat -= 0.075
                            }
                            interSenderEcoFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(ecosystemZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Public Goods')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(publicGoodsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Public Goods')) {
                        if (interCatFlag) {
                            publicGoodsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.01);
                        }
                        metagovZoneRecipientCat = metagovZone;
                        metagovZoneSendersCat = metagovZone;
                        interSenderFlag = true;
                    } else if (receiver.startsWith('Public Goods')) {
                        if (interSenderFlag) {
                            publicGoodsZoneSendersCat -= 0.004
                            interSenderFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(publicGoodsZoneSendersCat += 0.005)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Metagov')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(metagovZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Metagov')) {
                        if (interCatFlag) {
                            metagovZoneRecipientCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(metagovZoneRecipientCat += 0.0125);
                        } else {
                            nodeY.push(metagovZoneRecipientCat += 0.01);
                        }
                        spsZoneRecipientsCat = spsZone;
                        interSenderMGFlag = true;
                    } else if (receiver.startsWith('Metagov')) {
                        if (interSenderMGFlag) {
                            metagovZoneSendersCat -= 0.06
                            interSenderMGFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(metagovZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);     
                    } else if (nodeName.startsWith('Providers')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(spsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Providers')) {
                        if (interCatFlag) {
                            spsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        nodeY.push(spsZoneRecipientsCat += 0.01);
                    } else if (receiver.startsWith('Providers')) {
                        nodeX.push(startPoint);
                        nodeY.push(spsZoneSendersCat -= 0.0075)
                    }
                
                } else if (nodeName.includes('2024Q2')) {
                    startPoint = quarterNumber*9 - quarterNumber + border;
                    if (nodeName.includes('Registrar')) {
                        nodeX.push(startPoint - quarterNumber + 2.5*border)
                        nodeY.push(registrarZone)
                    }
                    if (nodeName.startsWith('DAO Wallet')) {
                        nodeX.push(startPoint);
                        nodeY.push(daoWalletZone);
                        interCatFlag = true;
                        daoWalletZoneRecipientsCat = daoWalletZone;
                    } else if (sender.startsWith('DAO Wallet')) {
                        if (interCatFlag) {
                            if (hideMode) {
                                daoWalletZoneRecipientsCat += 0.025;
                            } else {
                                daoWalletZoneRecipientsCat += 0.14;
                            }
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.03);
                        } else {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.01);
                        }
                        ecosystemZoneRecipientsCat = ecosystemZone;
                        ecosystemZoneSendersCat = ecosystemZone;
                    } else if (nodeName.startsWith('Ecosystem')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));
                        nodeY.push(ecosystemZone);
                        interCatFlag = true;
                        ecosystemZoneSendersCat = ecosystemZone + 0.03;
                    } else if (sender.startsWith('Ecosystem')) {
                        if (interCatFlag) {
                            ecosystemZoneRecipientsCat += 0.03;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.01);
                        }
                        publicGoodsZoneRecipientsCat = publicGoodsZone;
                        interSenderEcoFlag = true;
                    } else if (receiver.startsWith('Ecosystem')) {
                        if (interSenderEcoFlag) {
                            if (hideMode) {
                                ecosystemZoneSendersCat -= 0.1
                            } else {
                                ecosystemZoneSendersCat -= 0.075
                            }
                            interSenderEcoFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(ecosystemZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Public Goods')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(publicGoodsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Public Goods')) {
                        if (interCatFlag) {
                            publicGoodsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.01);
                        }
                        metagovZoneRecipientCat = metagovZone;
                        metagovZoneSendersCat = metagovZone;
                        interSenderFlag = true;
                    } else if (receiver.startsWith('Public Goods')) {
                        if (interSenderFlag) {
                            publicGoodsZoneSendersCat -= 0.004
                            interSenderFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(publicGoodsZoneSendersCat += 0.005)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Metagov')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(metagovZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Metagov')) {
                        if (interCatFlag) {
                            if (hideMode) {
                                metagovZoneRecipientCat += 0.05;
                            } else {
                                metagovZoneRecipientCat += 0.02;
                            }
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(metagovZoneRecipientCat += 0.0125);
                        } else {
                            nodeY.push(metagovZoneRecipientCat += 0.01);
                        }
                        spsZoneRecipientsCat = spsZone;
                        interSenderMGFlag = true;
                    } else if (receiver.startsWith('Metagov')) {
                        if (interSenderMGFlag) {
                            metagovZoneSendersCat -= 0.06
                            interSenderMGFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(metagovZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Providers')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(spsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Providers')) {
                        if (interCatFlag) {
                            spsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        nodeY.push(spsZoneRecipientsCat += 0.01);
                    } else if (receiver.startsWith('Providers')) {
                        nodeX.push(startPoint);
                        nodeY.push(spsZoneSendersCat -= 0.0075)
                    }

                } else if (nodeName.includes('2024Q3')) {
                    startPoint = quarterNumber*10 - quarterNumber + border;
                    if (nodeName.includes('Registrar')) {
                        nodeX.push(startPoint - quarterNumber + 2.5*border)
                        nodeY.push(registrarZone)
                    }
                    if (nodeName.startsWith('DAO Wallet')) {
                        nodeX.push(startPoint);
                        nodeY.push(daoWalletZone);
                        interCatFlag = true;
                        daoWalletZoneRecipientsCat = daoWalletZone;
                    } else if (sender.startsWith('DAO Wallet')) {
                        if (interCatFlag) {
                            if (hideMode) {
                                daoWalletZoneRecipientsCat += 0.025;
                            } else {
                                daoWalletZoneRecipientsCat += 0.14;
                            }
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.03);
                        } else {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.01);
                        }
                        ecosystemZoneRecipientsCat = ecosystemZone;
                        spsZoneRecipientsCat = spsZone;
                    } else if (nodeName.startsWith('Ecosystem')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));
                        nodeY.push(ecosystemZone);
                        interCatFlag = true;
                        ecosystemZoneSendersCat = ecosystemZone + 0.03;
                    } else if (sender.startsWith('Ecosystem')) {
                        if (interCatFlag) {
                            ecosystemZoneRecipientsCat += 0.03;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.01);
                        }
                        publicGoodsZoneRecipientsCat = publicGoodsZone;
                        interSenderEcoFlag = true;
                    } else if (receiver.startsWith('Ecosystem')) {
                        if (interSenderEcoFlag) {
                            if (hideMode) {
                                ecosystemZoneSendersCat -= 0.1
                            } else {
                                ecosystemZoneSendersCat -= 0.075
                            }
                            interSenderEcoFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(ecosystemZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Public Goods')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(publicGoodsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Public Goods')) {
                        if (interCatFlag) {
                            publicGoodsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.01);
                        }
                        metagovZoneRecipientCat = metagovZone;
                        metagovZoneSendersCat = metagovZone;
                        interSenderFlag = true;
                    } else if (receiver.startsWith('Public Goods')) {
                        if (interSenderFlag) {
                            publicGoodsZoneSendersCat -= 0.004
                            interSenderFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(publicGoodsZoneSendersCat += 0.005)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Metagov')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(metagovZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Metagov')) {
                        if (hideMode) {
                            if (interCatFlag) {
                                metagovZoneRecipientCat += 0.04;
                                nodeX.push(startPoint + quarterNumber -  2.5*border);
                                nodeY.push(metagovZoneRecipientCat += 0.01);
                                metagovZoneRecipientCat += 0.03;
                                interCatFlag = false;
                            } else {
                                nodeX.push(startPoint + quarterNumber -  2.5*border);
                                nodeY.push(metagovZoneRecipientCat += 0.0125);
                            }
                        } else {
                            if (interCatFlag) {
                                metagovZoneRecipientCat += 0.02;
                                interCatFlag = false;
                            }
                            nodeX.push(startPoint + quarterNumber -  2.5*border);
                            nodeY.push(metagovZoneRecipientCat += 0.01);
                        }
                        spsZoneRecipientsCat = spsZone;
                        interSenderMGFlag = true;
                    } else if (receiver.startsWith('Metagov')) {
                        if (interSenderMGFlag) {
                            metagovZoneSendersCat -= 0.06
                            interSenderMGFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(metagovZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);   
                    } else if (nodeName.startsWith('Providers')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(spsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Providers')) {
                        if (interCatFlag) {
                            spsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        nodeY.push(spsZoneRecipientsCat += 0.01);
                    } else if (receiver.startsWith('Providers')) {
                        nodeX.push(startPoint);
                        nodeY.push(spsZoneSendersCat -= 0.0075)
                    }
                    
                } else if (nodeName.includes('2024Q4')) {
                    startPoint = quarterNumber*11 - quarterNumber + border;
                    if (nodeName.includes('Registrar')) {
                        nodeX.push(startPoint - quarterNumber + 2.5*border)
                        nodeY.push(registrarZone)
                    }
                    if (nodeName.startsWith('DAO Wallet')) {
                        nodeX.push(startPoint);
                        nodeY.push(daoWalletZone);
                        interCatFlag = true;
                        daoWalletZoneRecipientsCat = daoWalletZone;
                    } else if (sender.startsWith('DAO Wallet')) {
                        if (interCatFlag) {
                            if (hideMode) {
                                daoWalletZoneRecipientsCat += 0.025;
                            } else {
                                daoWalletZoneRecipientsCat += 0.14;
                            }
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.03);
                        } else {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.01);
                        }
                        ecosystemZoneRecipientsCat = ecosystemZone;
                        spsZoneRecipientsCat = spsZone;
                    } else if (nodeName.startsWith('Ecosystem')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));
                        nodeY.push(ecosystemZone);
                        interCatFlag = true;
                        ecosystemZoneSendersCat = ecosystemZone + 0.03;
                    } else if (sender.startsWith('Ecosystem')) {
                        if (interCatFlag) {
                            ecosystemZoneRecipientsCat += 0.03;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.01);
                        }
                        publicGoodsZoneRecipientsCat = publicGoodsZone;
                        interSenderEcoFlag = true;
                    } else if (receiver.startsWith('Ecosystem')) {
                        if (interSenderEcoFlag) {
                            if (hideMode) {
                                ecosystemZoneSendersCat -= 0.1
                            } else {
                                ecosystemZoneSendersCat -= 0.075
                            }
                            interSenderEcoFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(ecosystemZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Public Goods')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(publicGoodsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Public Goods')) {
                        if (interCatFlag) {
                            publicGoodsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.01);
                        }
                        metagovZoneRecipientCat = metagovZone;
                        metagovZoneSendersCat = metagovZone;
                        interSenderFlag = true;
                    } else if (receiver.startsWith('Public Goods')) {
                        if (interSenderFlag) {
                            publicGoodsZoneSendersCat -= 0.004
                            interSenderFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(publicGoodsZoneSendersCat += 0.005)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Metagov')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(metagovZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Metagov')) {
                        if (hideMode) {
                            if (interCatFlag) {
                                metagovZoneRecipientCat += 0.04;
                                nodeX.push(startPoint + quarterNumber -  2.5*border);
                                nodeY.push(metagovZoneRecipientCat += 0.01);
                                metagovZoneRecipientCat += 0.03;
                                interCatFlag = false;
                            } else {
                                nodeX.push(startPoint + quarterNumber -  2.5*border);
                                nodeY.push(metagovZoneRecipientCat += 0.0125);
                            }
                        } else {
                            if (interCatFlag) {
                                metagovZoneRecipientCat += 0.02;
                                interCatFlag = false;
                            }
                            nodeX.push(startPoint + quarterNumber -  2.5*border);
                            nodeY.push(metagovZoneRecipientCat += 0.01);
                        }
                        spsZoneRecipientsCat = spsZone;
                        interSenderMGFlag = true;
                    } else if (receiver.startsWith('Metagov')) {
                        if (interSenderMGFlag) {
                            metagovZoneSendersCat -= 0.06
                            interSenderMGFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(metagovZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);   
                    } else if (nodeName.startsWith('Providers')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(spsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Providers')) {
                        if (interCatFlag) {
                            spsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        nodeY.push(spsZoneRecipientsCat += 0.01);
                    } else if (receiver.startsWith('Providers')) {
                        nodeX.push(startPoint);
                        nodeY.push(spsZoneSendersCat -= 0.0075)
                    }
                } else if (nodeName.includes('2025Q1')) {
                    startPoint = quarterNumber*12 - quarterNumber + border;
                    if (nodeName.includes('Registrar')) {
                        nodeX.push(startPoint - quarterNumber + 2.5*border)
                        nodeY.push(registrarZone)
                    }
                    if (nodeName.startsWith('DAO Wallet')) {
                        nodeX.push(startPoint);
                        nodeY.push(daoWalletZone);
                        interCatFlag = true;
                        daoWalletZoneRecipientsCat = daoWalletZone;
                    } else if (sender.startsWith('DAO Wallet')) {
                        if (interCatFlag) {
                            if (hideMode) {
                                daoWalletZoneRecipientsCat += 0.025;
                            } else {
                                daoWalletZoneRecipientsCat += 0.14;
                            }
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.03);
                        } else {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.01);
                        }
                        ecosystemZoneRecipientsCat = ecosystemZone;
                        spsZoneRecipientsCat = spsZone;
                    } else if (nodeName.startsWith('Ecosystem')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));
                        nodeY.push(ecosystemZone);
                        interCatFlag = true;
                        ecosystemZoneSendersCat = ecosystemZone + 0.03;
                    } else if (sender.startsWith('Ecosystem')) {
                        if (interCatFlag) {
                            ecosystemZoneRecipientsCat += 0.03;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.01);
                        }
                        publicGoodsZoneRecipientsCat = publicGoodsZone;
                        interSenderEcoFlag = true;
                    } else if (receiver.startsWith('Ecosystem')) {
                        if (interSenderEcoFlag) {
                            if (hideMode) {
                                ecosystemZoneSendersCat -= 0.1
                            } else {
                                ecosystemZoneSendersCat -= 0.075
                            }
                            interSenderEcoFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(ecosystemZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Public Goods')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(publicGoodsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Public Goods')) {
                        if (interCatFlag) {
                            publicGoodsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.01);
                        }
                        metagovZoneRecipientCat = metagovZone;
                        metagovZoneSendersCat = metagovZone;
                        interSenderFlag = true;
                    } else if (receiver.startsWith('Public Goods')) {
                        if (interSenderFlag) {
                            publicGoodsZoneSendersCat -= 0.004
                            interSenderFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(publicGoodsZoneSendersCat += 0.005)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Metagov')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(metagovZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Metagov')) {
                        if (hideMode) {
                            if (interCatFlag) {
                                metagovZoneRecipientCat += 0.04;
                                nodeX.push(startPoint + quarterNumber -  2.5*border);
                                nodeY.push(metagovZoneRecipientCat += 0.01);
                                metagovZoneRecipientCat += 0.03;
                                interCatFlag = false;
                            } else {
                                nodeX.push(startPoint + quarterNumber -  2.5*border);
                                nodeY.push(metagovZoneRecipientCat += 0.0125);
                            }
                        } else {
                            if (interCatFlag) {
                                metagovZoneRecipientCat += 0.02;
                                interCatFlag = false;
                            }
                            nodeX.push(startPoint + quarterNumber -  2.5*border);
                            nodeY.push(metagovZoneRecipientCat += 0.01);
                        }
                        spsZoneRecipientsCat = spsZone;
                        interSenderMGFlag = true;
                    } else if (receiver.startsWith('Metagov')) {
                        if (interSenderMGFlag) {
                            metagovZoneSendersCat -= 0.06
                            interSenderMGFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(metagovZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);   
                    } else if (nodeName.startsWith('Providers')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(spsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Providers')) {
                        if (interCatFlag) {
                            spsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        nodeY.push(spsZoneRecipientsCat += 0.01);
                    } else if (receiver.startsWith('Providers')) {
                        nodeX.push(startPoint);
                        nodeY.push(spsZoneSendersCat -= 0.0075)
                    }
                } else if (nodeName.includes('2025Q2')) {
                    startPoint = quarterNumber*13 - quarterNumber + border;
                    if (nodeName.includes('Registrar')) {
                        nodeX.push(startPoint - quarterNumber + 2.5*border)
                        nodeY.push(registrarZone)
                    }
                    if (nodeName.startsWith('DAO Wallet')) {
                        nodeX.push(startPoint);
                        nodeY.push(daoWalletZone);
                        interCatFlag = true;
                        daoWalletZoneRecipientsCat = daoWalletZone;
                    } else if (sender.startsWith('DAO Wallet')) {
                        if (interCatFlag) {
                            if (hideMode) {
                                daoWalletZoneRecipientsCat += 0.025;
                            } else {
                                daoWalletZoneRecipientsCat += 0.14;
                            }
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.03);
                        } else {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.01);
                        }
                        ecosystemZoneRecipientsCat = ecosystemZone;
                        spsZoneRecipientsCat = spsZone;
                    } else if (nodeName.startsWith('Ecosystem')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));
                        nodeY.push(ecosystemZone);
                        interCatFlag = true;
                        ecosystemZoneSendersCat = ecosystemZone + 0.03;
                    } else if (sender.startsWith('Ecosystem')) {
                        if (interCatFlag) {
                            ecosystemZoneRecipientsCat += 0.03;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.01);
                        }
                        publicGoodsZoneRecipientsCat = publicGoodsZone;
                        interSenderEcoFlag = true;
                    } else if (receiver.startsWith('Ecosystem')) {
                        if (interSenderEcoFlag) {
                            if (hideMode) {
                                ecosystemZoneSendersCat -= 0.1
                            } else {
                                ecosystemZoneSendersCat -= 0.075
                            }
                            interSenderEcoFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(ecosystemZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Public Goods')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(publicGoodsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Public Goods')) {
                        if (interCatFlag) {
                            publicGoodsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.01);
                        }
                        metagovZoneRecipientCat = metagovZone;
                        metagovZoneSendersCat = metagovZone;
                        interSenderFlag = true;
                    } else if (receiver.startsWith('Public Goods')) {
                        if (interSenderFlag) {
                            publicGoodsZoneSendersCat -= 0.004
                            interSenderFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(publicGoodsZoneSendersCat += 0.005)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Metagov')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(metagovZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Metagov')) {
                        if (hideMode) {
                            if (interCatFlag) {
                                metagovZoneRecipientCat += 0.04;
                                nodeX.push(startPoint + quarterNumber -  2.5*border);
                                nodeY.push(metagovZoneRecipientCat += 0.01);
                                metagovZoneRecipientCat += 0.03;
                                interCatFlag = false;
                            } else {
                                nodeX.push(startPoint + quarterNumber -  2.5*border);
                                nodeY.push(metagovZoneRecipientCat += 0.0125);
                            }
                        } else {
                            if (interCatFlag) {
                                metagovZoneRecipientCat += 0.02;
                                interCatFlag = false;
                            }
                            nodeX.push(startPoint + quarterNumber -  2.5*border);
                            nodeY.push(metagovZoneRecipientCat += 0.01);
                        }
                        spsZoneRecipientsCat = spsZone;
                        interSenderMGFlag = true;
                    } else if (receiver.startsWith('Metagov')) {
                        if (interSenderMGFlag) {
                            metagovZoneSendersCat -= 0.06
                            interSenderMGFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(metagovZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);   
                    } else if (nodeName.startsWith('Providers')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(spsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Providers')) {
                        if (interCatFlag) {
                            spsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        nodeY.push(spsZoneRecipientsCat += 0.01);
                    } else if (receiver.startsWith('Providers')) {
                        nodeX.push(startPoint);
                        nodeY.push(spsZoneSendersCat -= 0.0075)
                    }
                } else if (nodeName.includes('2025Q3')) {
                    startPoint = quarterNumber*14 - quarterNumber + border;
                    if (nodeName.includes('Registrar')) {
                        nodeX.push(startPoint - quarterNumber + 2.5*border)
                        nodeY.push(registrarZone)
                    }
                    if (nodeName.startsWith('DAO Wallet')) {
                        nodeX.push(startPoint);
                        nodeY.push(daoWalletZone);
                        interCatFlag = true;
                        daoWalletZoneRecipientsCat = daoWalletZone;
                    } else if (sender.startsWith('DAO Wallet')) {
                        if (interCatFlag) {
                            if (hideMode) {
                                daoWalletZoneRecipientsCat += 0.025;
                            } else {
                                daoWalletZoneRecipientsCat += 0.14;
                            }
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.03);
                        } else {
                            nodeY.push(daoWalletZoneRecipientsCat += 0.01);
                        }
                        ecosystemZoneRecipientsCat = ecosystemZone;
                        spsZoneRecipientsCat = spsZone;
                    } else if (nodeName.startsWith('Ecosystem')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));
                        nodeY.push(ecosystemZone);
                        interCatFlag = true;
                        ecosystemZoneSendersCat = ecosystemZone + 0.03;
                    } else if (sender.startsWith('Ecosystem')) {
                        if (interCatFlag) {
                            ecosystemZoneRecipientsCat += 0.03;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(ecosystemZoneRecipientsCat += 0.01);
                        }
                        publicGoodsZoneRecipientsCat = publicGoodsZone;
                        interSenderEcoFlag = true;
                    } else if (receiver.startsWith('Ecosystem')) {
                        if (interSenderEcoFlag) {
                            if (hideMode) {
                                ecosystemZoneSendersCat -= 0.1
                            } else {
                                ecosystemZoneSendersCat -= 0.075
                            }
                            interSenderEcoFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(ecosystemZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Public Goods')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(publicGoodsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Public Goods')) {
                        if (interCatFlag) {
                            publicGoodsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        if (hideMode) {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.0125);
                        } else {
                            nodeY.push(publicGoodsZoneRecipientsCat += 0.01);
                        }
                        metagovZoneRecipientCat = metagovZone;
                        metagovZoneSendersCat = metagovZone;
                        interSenderFlag = true;
                    } else if (receiver.startsWith('Public Goods')) {
                        if (interSenderFlag) {
                            publicGoodsZoneSendersCat -= 0.004
                            interSenderFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(publicGoodsZoneSendersCat += 0.005)
                        zoneSendersList.push(nodeName);
                    } else if (nodeName.startsWith('Metagov')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(metagovZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Metagov')) {
                        if (hideMode) {
                            if (interCatFlag) {
                                metagovZoneRecipientCat += 0.04;
                                nodeX.push(startPoint + quarterNumber -  2.5*border);
                                nodeY.push(metagovZoneRecipientCat += 0.01);
                                metagovZoneRecipientCat += 0.03;
                                interCatFlag = false;
                            } else {
                                nodeX.push(startPoint + quarterNumber -  2.5*border);
                                nodeY.push(metagovZoneRecipientCat += 0.0125);
                            }
                        } else {
                            if (interCatFlag) {
                                metagovZoneRecipientCat += 0.02;
                                interCatFlag = false;
                            }
                            nodeX.push(startPoint + quarterNumber -  2.5*border);
                            nodeY.push(metagovZoneRecipientCat += 0.01);
                        }
                        spsZoneRecipientsCat = spsZone;
                        interSenderMGFlag = true;
                    } else if (receiver.startsWith('Metagov')) {
                        if (interSenderMGFlag) {
                            metagovZoneSendersCat -= 0.06
                            interSenderMGFlag = false;
                        }
                        nodeX.push(startPoint);
                        nodeY.push(metagovZoneSendersCat += 0.01)
                        zoneSendersList.push(nodeName);   
                    } else if (nodeName.startsWith('Providers')) {
                        nodeX.push(startPoint + (quarterNumber/2.5));;
                        nodeY.push(spsZone);
                        interCatFlag = true;
                    } else if (sender.startsWith('Providers')) {
                        if (interCatFlag) {
                            spsZoneRecipientsCat += 0.02;
                            interCatFlag = false;
                        }
                        nodeX.push(startPoint + quarterNumber -  2.5*border);
                        nodeY.push(spsZoneRecipientsCat += 0.01);
                    } else if (receiver.startsWith('Providers')) {
                        nodeX.push(startPoint);
                        nodeY.push(spsZoneSendersCat -= 0.0075)
                    }
                } else if (sender === 'Plchld') {
                    nodeX.push(dummyNodeXY);
                    nodeY.push(dummyNodeXY);
                }
            }
            safeYAxisExport.push(nodeY);
            return nodeIndices[nodeName];
        };
        
        if (quarter && !isYear) {
            if (nodeName.includes('Registrar') 
                || (sender === 'Community WG' && receiver.startsWith('Dissolution'))
                || (sender === 'Community WG' && receiver.startsWith('Unspent'))
                || (receiver.endsWith('Swap') || sender.endsWith('Swap'))
                || (receiver === 'CoW' || sender === 'CoW')
                || (sender === 'Dissolved Community WG' && receiver === 'Ecosystem')) {
                return -1;
            }
            if (!nodeIndices[nodeName]) {
                nodeIndices[nodeName] = nodes.length;
                nodes.push(nodeName);
                if (model === 1) {
                    pad = 10;
                    if (nodeName === 'DAO Wallet') {
                        nodeX.push(daoWalletX)
                        nodeY.push(daoWalletY += 0.1);
                        interCatFlag = true;
                    } else if (nodeName === 'Community WG') {
                        nodeX.push(specialWalletsX);
                        nodeY.push(lastCommunityWGY = 1.3);
                    } else if (sender === 'DAO Wallet' && !specialWallets.hasOwnProperty(nodeName)) {
                        daoWalletRecipients.push(nodeName);
                        nodeX.push(0.95);
                        if (quarter === '2022Q2') {
                            if (daoWalletRecipients.length != 1) {
                                nodeY.push(lastDaoWalletY += (daoWalletRecipients.length * 0.1));
                            } else {
                                nodeY.push(lastDaoWalletY = daoWalletY - 0.1)
                            }
                        } else {
                            if (interCatFlag) {
                                lastDaoWalletY -= 0.035;
                                interCatFlag = false;
                            }
                            nodeY.push(lastDaoWalletY += 0.1)
                        }
                    } else if (nodeName === 'Ecosystem') {
                        nodeX.push(specialWalletsX);
                        nodeY.push(lastEcosystemY = lastDaoWalletY + 0.25);
                        interCatFlag = true;
                    } else if (sender === 'Ecosystem') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            nodeX.push(lastX);
                            nodeY.push(lastEcosystemY);
                            if (quarter !== '2022Q2') {
                                lastEcosystemY += 0.04;
                            }
                            interCatFlag = false;
                        } else {
                            nodeX.push(lastX);
                            nodeY.push(lastEcosystemY += 0.05);
                        }
                        ecosystemRecipients.push(nodeName);
                    } else if (nodeName === 'Public Goods') {
                        nodeX.push(specialWalletsX);
                        nodeY.push(lastPublicGoodsY = lastEcosystemY + 0.1);
                        interCatFlag = true;
                    } else if (sender === 'Public Goods') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            nodeX.push(lastX);
                            nodeY.push(lastPublicGoodsY);
                            interCatFlag = false;
                        } else {
                            nodeX.push(lastX);
                            nodeY.push(lastPublicGoodsY += 0.05);
                        }
                        publicGoodsRecipients.push(nodeName);
                    } else if (nodeName === 'Metagov') {
                        nodeX.push(specialWalletsX);
                        nodeY.push(lastMetagovY = lastPublicGoodsY + 0.1);
                        interCatFlag = true;
                    } else if (sender === 'Metagov') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            nodeX.push(lastX);
                            nodeY.push(lastMetagovY);
                            interCatFlag = false;
                        } else {
                            nodeX.push(lastX);
                            nodeY.push(lastMetagovY += 0.05);
                        }
                        metagovRecipients.push(nodeName);
                    } else if (nodeName === 'Community WG') {
                        interCatFlag = true;
                    } else if (sender === 'Community WG') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            nodeX.push(lastX);
                            nodeY.push(lastCommunityWGY);
                            interCatFlag = false;
                        } else {
                            nodeX.push(lastX);
                            nodeY.push(lastCommunityWGY += 0.05);
                        }
                        communityWGRecipients.push(nodeName);
                    } else if (nodeName === 'Providers') {
                        nodeX.push(specialWalletsX);
                        nodeY.push(lastSpsY = lastMetagovY + 0.1);
                        interCatFlag = true;
                    } else if (sender == 'Providers') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            nodeX.push(lastX);
                            nodeY.push(lastSpsY);
                            interCatFlag = false;
                        } else {
                            nodeX.push(lastX);
                            nodeY.push(lastSpsY += 0.06);
                        }
                        spsRecipients.push(nodeName);
                    }
                } else if (model === 2) {
                    pad = 10;
                    if (nodeName === 'DAO Wallet') {
                        daoWalletY -= 0.1;
                        nodeX.push(daoWalletX);
                        nodeY.push(daoWalletY);
                    } else if (sender === 'DAO Wallet' && !specialWallets.hasOwnProperty(nodeName)) {
                        daoWalletRecipients.push(nodeName);
                        nodeX.push(0.95);
                        if (daoWalletRecipients.length != 1) {
                            lastDaoWalletY += (daoWalletRecipients.length * 0.1)
                        } else {
                            nodeY.push(lastDaoWalletY = daoWalletY)
                        }
                    } else if (nodeName === 'Ecosystem') {
                        nodeX.push(daoWalletX);
                        nodeY.push(lastEcosystemY = lastDaoWalletY + 0.2);
                        interCatFlag = true;
                    } else if (sender === 'Ecosystem') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            nodeX.push(lastX);
                            nodeY.push(lastEcosystemY);
                            lastEcosystemY += 0.05
                            interCatFlag = false;
                        } else {
                            nodeX.push(lastX);
                            nodeY.push(lastEcosystemY += 0.07);
                        }
                        ecosystemRecipients.push(nodeName);
                    } else if (nodeName === 'Public Goods') {
                        if (innerTransfers) {
                            nodeX.push(specialWalletsX);
                        } else {
                            nodeX.push(daoWalletX);
                        }
                        nodeY.push(lastPublicGoodsY = lastEcosystemY + 0.1);
                        interCatFlag = true;
                    } else if (sender === 'Public Goods') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            nodeX.push(lastX);
                            nodeY.push(lastPublicGoodsY);
                            interCatFlag = false;
                        } else {
                            nodeX.push(lastX);
                            nodeY.push(lastPublicGoodsY += 0.07);
                        }
                        publicGoodsRecipients.push(nodeName);
                    } else if (nodeName === 'Metagov') {
                        nodeX.push(daoWalletX);
                        nodeY.push(lastMetagovY = lastPublicGoodsY + 0.1);
                        interCatFlag = true;
                    } else if (sender === 'Metagov') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            nodeX.push(lastX);
                            nodeY.push(lastMetagovY);
                            interCatFlag = false;
                        } else {
                            nodeX.push(lastX);
                            nodeY.push(lastMetagovY += 0.07);
                        }
                        metagovRecipients.push(nodeName);
                    } else if (nodeName === 'Providers') {
                        nodeX.push(daoWalletX);
                        lastSpsY = lastMetagovY + 0.07;
                        interCatFlag = true;
                    } else if (sender == 'Providers') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            nodeX.push(lastX);
                            nodeY.push(lastSpsY);
                            interCatFlag = false;
                        } else {
                            nodeX.push(lastX);
                            nodeY.push(lastSpsY += 0.07);
                        }
                        spsRecipients.push(nodeName);
                    } 
                } else if (model === 3) {
                    if (nodeName === 'DAO Wallet') {
                        nodeX.push(daoWalletX);
                        nodeY.push(daoWalletY);
                    } else if (nodeName === 'Ecosystem') {
                        nodeX.push(specialWalletsX);
                        nodeY.push(lastDaoWalletY = daoWalletY - 0.1);
                        interCatFlag = true;
                        senderFlag = true;
                    } else if (sender === 'Ecosystem') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            interCatFlag = false;
                            lastEcosystemY -= 0.225
                        }
                        nodeX.push(lastX -= 0.03);
                        nodeY.push(lastEcosystemY += 0.085);
                        ecosystemRecipients.push(nodeName);
                    } else if (receiver === 'Ecosystem') {
                        if (!specialWallets.hasOwnProperty(sender)) {
                            if (senderFlag) {
                                lastEcosystemSenderY += 0.2
                                senderFlag = false;
                            }
                        nodeX.push(daoWalletX);
                        nodeY.push(lastEcosystemSenderY += 0.05);
                        ecosystemSenders.push(nodeName);
                        }
                    } else if (nodeName === 'Public Goods') {
                        nodeX.push(specialWalletsX);
                        nodeY.push(lastPublicGoodsY = lastEcosystemY + 0.05);
                        interCatFlag = true;
                        senderFlag = true;
                    } else if (sender === 'Public Goods') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            interCatFlag = false;
                        }
                        nodeX.push(lastX -= 0.03);
                        nodeY.push(lastPublicGoodsY += 0.085);
                        publicGoodsRecipients.push(nodeName);
                    } else if (receiver === 'Public Goods') {
                        if (!specialWallets.hasOwnProperty(sender)) {
                            if (senderFlag) {
                                lastPublicGoodsSenderY += 0.2
                                senderFlag = false;
                            }
                        nodeX.push(daoWalletX);
                        nodeY.push(lastPublicGoodsSenderY += 0.05);
                        publicGoodsSenders.push(nodeName);
                        }
                    } else if (nodeName === 'Metagov') {
                        nodeX.push(specialWalletsX);
                        nodeY.push(lastMetagovY = lastPublicGoodsY + 0.05);
                        interCatFlag = true;
                        senderFlag = true;
                    } else if (sender === 'Metagov') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            interCatFlag = false;
                            lastMetagovY += 0.015
                        }
                        nodeX.push(lastX -= 0.03);
                        nodeY.push(lastMetagovY += 0.085);
                        metagovRecipients.push(nodeName);
                    } else if (receiver === 'Metagov') {
                        if (!specialWallets.hasOwnProperty(sender)) {
                            if (senderFlag) {
                                lastMetagovSenderY += 0.2
                                senderFlag = false;
                            }
                        nodeX.push(daoWalletX);
                        nodeY.push(lastMetagovSenderY += 0.05);
                        metagovSenders.push(nodeName);
                        }
                    } else if (nodeName === 'Community WG') {
                        nodeX.push(specialWalletsX);
                        nodeY.push(lastCommunityWGY = lastMetagovY + 0.05);
                        interCatFlag = true;
                        senderFlag = true;
                    } else if (sender === 'Community WG') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            interCatFlag = false;
                        }
                        nodeX.push(lastX -= 0.03);
                        nodeY.push(lastCommunityWGY += 0.085);
                        communityWGRecipients.push(nodeName);
                    } else if (receiver === 'Community WG') {
                        if (!specialWallets.hasOwnProperty(sender)) {
                            if (senderFlag) {
                                lastCommunityWGSenderY += 0.2
                                senderFlag = false;
                            }
                        nodeX.push(daoWalletX);
                        nodeY.push(lastCommunityWGSenderY += 0.05);
                        communityWGSenders.push(nodeName);
                        }
                    } else if (nodeName === 'Providers') {
                        nodeX.push(specialWalletsX);
                        nodeY.push(lastSpsY = lastMetagovY + 0.05);
                        interCatFlag = true;
                        senderFlag = true;
                    } else if (sender == 'Providers') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            interCatFlag = false;
                        }
                        nodeX.push(lastX -= 0.03);
                        nodeY.push(lastSpsY += 0.085);
                        spsRecipients.push(nodeName);
                    } else if (receiver === 'Providers') {
                        if (!specialWallets.hasOwnProperty(sender)) {
                            if (senderFlag) {
                                lastSpsSenderY += 0.2
                                senderFlag = false;
                            }
                        nodeX.push(daoWalletX);
                        nodeY.push(lastSpsSenderY += 0.05);
                        spsSenders.push(nodeName);
                        }
                    }
                } else if (model === 4) {
                    pad = 10;
                    if (nodeName === 'DAO Wallet') {
                        daoWalletY -= 0.1;
                        nodeX.push(daoWalletX);
                        nodeY.push(daoWalletY);
                    } else if (sender === 'DAO Wallet' && !specialWallets.hasOwnProperty(nodeName)) {
                        daoWalletRecipients.push(nodeName);
                        nodeX.push(0.95);
                        if (daoWalletRecipients.length != 1) {
                            lastDaoWalletY += (daoWalletRecipients.length * 0.1)
                        } else {
                            nodeY.push(lastDaoWalletY = daoWalletY)
                        }
                    } else if (nodeName === 'Ecosystem') {
                        nodeX.push(daoWalletX);
                        nodeY.push(lastEcosystemY = lastDaoWalletY + 0.3);
                        lastEcosystemSenderY = lastEcosystemY;
                        interCatFlag = true;
                    } else if (sender === 'Ecosystem') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            nodeX.push(lastX);
                            nodeY.push(lastEcosystemY);
                            lastEcosystemY += 0.075
                            interCatFlag = false;
                        } else {
                            nodeX.push(lastX);
                            nodeY.push(lastEcosystemY += 0.07);
                        }
                        ecosystemRecipients.push(nodeName);
                    } else if (receiver === 'Ecosystem') {
                        nodeX.push(daoWalletX);
                        nodeY.push(lastEcosystemSenderY);
                        lastEcosystemSenderY += 0.06;
                        ecosystemSenders.push(nodeName);
                    } else if (nodeName === 'Public Goods') {
                        nodeX.push(daoWalletX);
                        nodeY.push(lastPublicGoodsY = lastEcosystemY + 0.1);
                        lastPublicGoodsSenderY = lastPublicGoodsY;
                        interCatFlag = true;
                    } else if (sender === 'Public Goods') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            nodeX.push(lastX);
                            nodeY.push(lastPublicGoodsY);
                            interCatFlag = false;
                        } else {
                            nodeX.push(lastX);
                            nodeY.push(lastPublicGoodsY += 0.07);
                        }
                        publicGoodsRecipients.push(nodeName);
                    } else if (receiver === 'Public Goods') {
                        if (!specialWallets.hasOwnProperty(sender)) {
                        nodeX.push(daoWalletX + 0.1);
                        nodeY.push(lastPublicGoodsSenderY);
                        lastPublicGoodsSenderY += 0.06;
                        publicGoodsSenders.push(nodeName);
                        }
                    } else if (nodeName === 'Metagov') {
                        nodeX.push(daoWalletX);
                        nodeY.push(lastMetagovY = lastPublicGoodsY + 0.1);
                        lastMetagovSenderY = lastMetagovY;
                        interCatFlag = true;
                    } else if (sender === 'Metagov') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            nodeX.push(lastX);
                            nodeY.push(lastMetagovY);
                            interCatFlag = false;
                        } else {
                            nodeX.push(lastX);
                            nodeY.push(lastMetagovY += 0.07);
                        }
                        metagovRecipients.push(nodeName);
                    } else if (receiver === 'Metagov') {
                        if (!specialWallets.hasOwnProperty(sender)) {
                            nodeX.push(daoWalletX);
                            nodeY.push(lastMetagovSenderY);
                            lastMetagovSenderY += 0.04;
                            metagovSenders.push(nodeName);
                        }
                    } else if (nodeName === 'Providers') {
                        nodeX.push(daoWalletX);
                        lastSpsY = lastMetagovY + 0.07;
                        lastSpsSenderY = lastSpsY;
                        interCatFlag = true;
                    } else if (sender == 'Providers') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            nodeX.push(lastX);
                            nodeY.push(lastSpsY);
                            interCatFlag = false;
                        } else {
                            nodeX.push(lastX);
                            nodeY.push(lastSpsY += 0.07);
                        }
                        spsRecipients.push(nodeName);
                    }
                } else if (model === 5) {
                    pad = 10;
                    if (nodeName === 'DAO Wallet') {
                        nodeX.push(daoWalletX);
                        nodeY.push(daoWalletY);
                    } else if (sender === 'DAO Wallet' && !specialWallets.hasOwnProperty(nodeName)) {
                        daoWalletRecipients.push(nodeName);
                        nodeX.push(0.95);
                        if (quarter === '2024Q3') {
                            nodeY.push(lastDaoWalletY -= 0.125);
                        } else if (quarter == '2023Q1') {
                            nodeY.push(lastDaoWalletY -= 0.075);
                        } else {
                            if (daoWalletRecipients.length != 1) {
                                nodeY.push(lastDaoWalletY += (daoWalletRecipients.length * 0.1));
                            } else {
                                nodeY.push(lastDaoWalletY = daoWalletY)
                            }
                        }
                    } else if (nodeName === 'Ecosystem') {
                        nodeX.push(specialWalletsX);
                        if (quarter !== '2024Q3') {
                            nodeY.push(lastEcosystemY = lastDaoWalletY + 0.2);
                        } else {
                            nodeY.push(lastEcosystemY = lastDaoWalletY + 0.1);
                        }
                        lastEcosystemSenderY = lastEcosystemY + 0.01;
                        interCatFlag = true;
                    } else if (sender === 'Ecosystem') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            if (receiver.startsWith('Unspent')) {
                                if (!unspentNodes.has(receiver)) {
                                    unspentNodes.add(receiver);
                                    nodeX.push(lastX);
                                    nodeY.push(lastEcosystemY);
                                }
                                return nodeIndices[receiver];
                            }
                            if (quarter == '2023Q1') {
                                lastEcosystemY += 0.07;
                            } else if (quarter == '2024Q2'){
                                lastEcosystemY += 0.04;
                            } else {
                                lastEcosystemY += 0.02;
                            }
                            interCatFlag = false;
                        }
                        nodeX.push(lastX);
                        nodeY.push(lastEcosystemY += 0.05);
                        ecosystemRecipients.push(nodeName);
                    } else if (receiver === 'Ecosystem') {
                        nodeX.push(daoWalletX);
                        nodeY.push(lastEcosystemSenderY);
                        lastEcosystemSenderY += 0.06;
                        ecosystemSenders.push(nodeName);
                    } else if (nodeName === 'Public Goods') {
                        nodeX.push(specialWalletsX);
                        nodeY.push(lastPublicGoodsY = lastEcosystemY + 0.08);
                        interCatFlag = true;
                    } else if (sender === 'Public Goods') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            if (receiver.startsWith('Unspent')) {
                                if (!unspentNodes.has(receiver)) {
                                    unspentNodes.add(receiver);
                                    nodeX.push(lastX);
                                    nodeY.push(lastPublicGoodsY);
                                }
                                return nodeIndices[receiver];
                            }
                            if (quarter == '2023Q1') {
                                lastPublicGoodsY += 0.007;
                            } else if (quarter == '2024Q2'){
                                lastPublicGoodsY += 0.01;
                            } else {
                                lastPublicGoodsY += 0.01;
                            }
                            interCatFlag = false;
                        }
                        nodeX.push(lastX);
                        nodeY.push(lastPublicGoodsY += 0.05);
                        publicGoodsRecipients.push(nodeName);
                    } else if (receiver === 'Public Goods') {
                        if (!specialWallets.hasOwnProperty(sender)) {
                        nodeX.push(daoWalletX + 0.1);
                        nodeY.push(lastPublicGoodsSenderY);
                        lastPublicGoodsSenderY += 0.06;
                        publicGoodsSenders.push(nodeName);
                        }
                    } else if (nodeName === 'Metagov') {
                        nodeX.push(specialWalletsX);
                        if (quarter == '2024Q3') {
                            nodeY.push(lastMetagovY = lastPublicGoodsY + 0.12);
                        } else {
                            nodeY.push(lastMetagovY = lastPublicGoodsY + 0.08);
                        }
                        lastMetagovSenderY = lastMetagovY;
                        interCatFlag = true;
                    } else if (sender === 'Metagov') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            if (receiver.startsWith('Unspent')) {
                                if (!unspentNodes.has(receiver)) {
                                    unspentNodes.add(receiver);
                                    nodeX.push(lastX);
                                    if (quarter == '2024Q3') {
                                        nodeY.push(lastMetagovY - 0.05);
                                    } else {
                                        nodeY.push(lastMetagovY);
                                    }
                                }
                                return nodeIndices[receiver];
                            }
                            if (quarter == '2023Q1') {
                                lastMetagovY += 0.02;
                            } else if (quarter == '2024Q2'){
                                lastMetagovY += 0.01;
                            } else {
                                lastMetagovY += 0.05;
                            }
                            interCatFlag = false;
                        }
                        nodeX.push(lastX);
                        nodeY.push(lastMetagovY += 0.05);
                        metagovRecipients.push(nodeName);
                    } else if (receiver === 'Metagov') {
                        if (!specialWallets.hasOwnProperty(sender)) {
                        nodeX.push(daoWalletX);
                        nodeY.push(lastMetagovSenderY);
                        lastMetagovSenderY += 0.04;
                        metagovSenders.push(nodeName);
                        }
                    } else if (nodeName === 'Community WG') {
                        nodeX.push(specialWalletsX);
                        nodeY.push(lastCommunityWGY = lastMetagovY + 0.08);
                        interCatFlag = true;
                    } else if (sender === 'Community WG') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            if (receiver.startsWith('Unspent')) {
                                if (!unspentNodes.has(receiver)) {
                                    unspentNodes.add(receiver);
                                    nodeX.push(lastX);
                                    nodeY.push(lastCommunityWGY);
                                }
                                return nodeIndices[receiver];
                            }
                            lastCommunityWGY += 0.02;
                            interCatFlag = false;
                        }
                        if (quarter == '2023Q4') {
                            nodeX.push(lastX);
                            nodeY.push(lastCommunityWGY += 0.03);
                        }
                        else {
                            nodeX.push(lastX);
                            nodeY.push(lastCommunityWGY += 0.04);
                        }
                        communityWGRecipients.push(nodeName);
                    } else if (receiver === 'Community WG') {
                        if (!specialWallets.hasOwnProperty(sender)) {
                        nodeX.push(daoWalletX + 0.1);
                        nodeY.push(lastCommunityWGSenderY);
                        lastCommunityWGSenderY += 0.06;
                        communityWGSenders.push(nodeName);
                        }
                    } else if (nodeName === 'Providers') {
                        nodeX.push(specialWalletsX);
                        if (quarter === '2024Q3') {
                            nodeY.push(lastSpsY = lastMetagovY + 0.15);
                        } else {
                            nodeY.push(lastSpsY = lastMetagovY + 0.08);
                        }
                        interCatFlag = true;
                    } else if (sender == 'Providers') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            if (receiver.startsWith('Unspent')) {
                                if (!unspentNodes.has(receiver)) {
                                    unspentNodes.add(receiver);
                                    nodeX.push(lastX);
                                    nodeY.push(lastSpsY);
                                }
                                return nodeIndices[receiver];
                            }
                            lastSpsY += 0.05
                            interCatFlag = false;
                        }
                        if (quarter == '2023Q4') {
                            nodeX.push(lastX);
                            nodeY.push(lastSpsY += 0.03);
                        }
                        else {
                            nodeX.push(lastX);
                            nodeY.push(lastSpsY += 0.005);
                        }
                        spsRecipients.push(nodeName);
                    }
                } else if (model === 'dissolution') {
                    pad = 10;
                    if (nodeName === 'DAO Wallet') {
                        nodeX.push(daoWalletX);
                        nodeY.push(daoWalletY += 0.05);
                    } else if (sender === 'DAO Wallet' && !specialWallets.hasOwnProperty(nodeName)) {
                        daoWalletRecipients.push(nodeName);
                        nodeX.push(0.95);
                        nodeY.push(daoWalletY - 0.1);
                    } else if (nodeName === 'Ecosystem') {
                        nodeX.push(specialWalletsX);
                        if (daoWalletRecipients.length > 1) {
                            nodeY.push(lastEcosystemY = daoWalletY + 0.4 + (daoWalletRecipients.length * 0.1));
                        } else {
                            nodeY.push(lastEcosystemY = daoWalletY + 0.2)
                        }
                        lastEcosystemSenderY = lastEcosystemY + 0.13;
                        interCatFlag = true;
                    } else if (sender === 'Ecosystem') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            nodeX.push(lastX);
                            nodeY.push(lastEcosystemY);
                            lastEcosystemY += 0.05;
                            interCatFlag = false;
                        } else {
                            nodeX.push(lastX);
                            nodeY.push(lastEcosystemY += 0.06);
                        }
                        ecosystemRecipients.push(nodeName);
                    } else if (receiver === 'Ecosystem') {
                        nodeX.push(daoWalletX);
                        nodeY.push(lastEcosystemSenderY -= 0.07);
                        lastEcosystemSenderY += 0.05;
                        ecosystemSenders.push(nodeName);
                    } else if (nodeName === 'Public Goods') {
                        nodeX.push(specialWalletsX);
                        nodeY.push(lastPublicGoodsY = lastEcosystemY + 0.08);
                        interCatFlag = true;
                    } else if (sender === 'Public Goods') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            nodeX.push(lastX);
                            nodeY.push(lastPublicGoodsY);
                            interCatFlag = false;
                        } else {
                            nodeX.push(lastX);
                            nodeY.push(lastPublicGoodsY += 0.06);
                        }
                        publicGoodsRecipients.push(nodeName);
                    } else if (receiver === 'Public Goods') {
                        if (!specialWallets.hasOwnProperty(sender)) {
                        nodeX.push(daoWalletX + 0.1);
                        nodeY.push(lastPublicGoodsSenderY);
                        lastPublicGoodsSenderY += 0.06;
                        publicGoodsSenders.push(nodeName);
                        }
                    } else if (nodeName === 'Metagov') {
                        nodeX.push(specialWalletsX);
                        nodeY.push(lastMetagovY = lastPublicGoodsY + 0.08);
                        lastMetagovSenderY = lastMetagovY;
                        interCatFlag = true;
                    } else if (sender === 'Metagov') {
                        if (interCatFlag) {
                            lastX = 0.95;
                            nodeX.push(lastX);
                            nodeY.push(lastMetagovY);
                            interCatFlag = false;
                        } else {
                            nodeX.push(lastX);
                            nodeY.push(lastMetagovY += 0.06);
                        }
                        metagovRecipients.push(nodeName);
                    } else if (receiver === 'Metagov') {
                        if (!specialWallets.hasOwnProperty(sender)) {
                        nodeX.push(daoWalletX);
                        nodeY.push(lastMetagovSenderY);
                        lastMetagovSenderY += 0.04;
                        metagovSenders.push(nodeName);
                        }
                    }
                } else if (model === 'temp') {
                    if (nodeName === 'DAO Wallet') {
                        nodeX.push(daoWalletX);
                        nodeY.push(daoWalletY += 0.1);
                    } else if (sender === 'DAO Wallet' && !specialWallets.hasOwnProperty(nodeName)) {
                        daoWalletRecipients.push(nodeName);
                        nodeX.push(0.95);
                        if (daoWalletRecipients.length != 1) {
                            nodeY.push(lastDaoWalletY += (daoWalletRecipients.length * 0.1));
                        } else {
                            nodeY.push(lastDaoWalletY = daoWalletY - 0.25)
                        }
                    } else if (nodeName === 'Ecosystem') {
                        nodeX.push(specialWalletsX);
                        nodeY.push(lastEcosystemY = lastDaoWalletY + 0.15);
                        interCatFlag = true;
                    } else if (sender === 'Ecosystem') {
                        if (interCatFlag) {
                            lastX = 0.98;
                            interCatFlag = false;
                        }
                        if (receiver.startsWith('Unspent')) {
                            lastX = 0.95;
                            if (!unspentNodes.has(receiver)) {
                                unspentNodes.add(receiver);
                                nodeX.push(lastX);
                                nodeY.push(lastEcosystemY);
                            }
                            lastEcosystemY += 0.04;
                            return nodeIndices[receiver];
                        } else {
                            nodeX.push(lastX -= 0.03);
                            nodeY.push(lastEcosystemY += 0.04);
                        }
                        ecosystemRecipients.push(nodeName);
                    } else if (nodeName === 'Public Goods') {
                        nodeX.push(specialWalletsX);
                        nodeY.push(lastPublicGoodsY = lastEcosystemY + 0.1);
                        interCatFlag = true;
                    } else if (sender === 'Public Goods') {
                        if (interCatFlag) {
                            lastX = 0.98;
                            interCatFlag = false;
                        }
                        if (receiver.startsWith('Unspent')) {
                            lastX = 0.95;
                            if (!unspentNodes.has(receiver)) {
                                unspentNodes.add(receiver);
                                nodeX.push(lastX);
                                nodeY.push(lastPublicGoodsY);
                            }
                            lastPublicGoodsY += 0.01;
                            return nodeIndices[receiver];
                        } else {
                            nodeX.push(lastX -= 0.03);
                            nodeY.push(lastPublicGoodsY += 0.04);
                        }
                        publicGoodsRecipients.push(nodeName);
                    } else if (nodeName === 'Metagov') {
                        nodeX.push(specialWalletsX);
                        nodeY.push(lastMetagovY = lastPublicGoodsY + 0.3);
                        interCatFlag = true;
                    } else if (sender === 'Metagov') {
                        if (receiver.startsWith('Unspent')) {
                            lastX = 0.95;
                            if (!unspentNodes.has(receiver)) {
                                unspentNodes.add(receiver);
                                nodeX.push(lastX);
                                nodeY.push(lastMetagovY - 0.1);
                            }
                            lastMetagovY += 0.17;
                            return nodeIndices[receiver];
                        } else {
                            nodeX.push(lastX -= 0.03);
                            nodeY.push(lastMetagovY += 0.04);
                        }
                        metagovRecipients.push(nodeName);
                    } else if (nodeName === 'Providers') {
                        nodeX.push(specialWalletsX);
                        nodeY.push(lastSpsY = lastMetagovY + 0.2);
                        interCatFlag = true;
                    }
                } 
                if (model === 'detailed') {
                    pad = 15;
                } else {
                    if (nodeName === 'Plchld') {
                        nodeX.push(dummyNodeXY);
                        nodeY.push(dummyNodeXY);
                    } else if (sender === 'Plchld') {
                        nodeX.push(dummyNodeXY);
                        nodeY.push(dummyNodeXY);
                    }
                }
                qtrReceiversList = ecosystemRecipients.concat(publicGoodsRecipients, metagovRecipients, communityWGRecipients, spsRecipients, daoWalletRecipients)
                qtrSendersList = ecosystemSenders.concat(publicGoodsSenders, metagovSenders, communityWGSenders, spsSenders)
            }
            return nodeIndices[nodeName];
        }

        if (isYear) {
            if (nodeName.includes('Registrar') 
                || (sender === 'Community WG' && receiver.startsWith('Dissolution'))
                || (receiver.endsWith('Swap') || sender.endsWith('Swap'))
                || (receiver === 'CoW' || sender === 'CoW')
                || (sender === 'Dissolved Community WG' && receiver === 'Ecosystem')) {
                    return -1;
                }
            pad = 1;
            if (!nodeIndices[nodeName]) {
                nodeIndices[nodeName] = nodes.length;
                nodes.push(nodeName);
                if (model === 'year') {
                    if (quarter === '2022' || quarter === '2023') {
                        if (nodeName === 'DAO Wallet') {
                            nodeX.push(daoWalletX);
                            nodeY.push(daoWalletY += 0.15);
                            lastDaoWalletY = daoWalletY;
                            lastDaoWalletY -= 0.25;
                        } else if (nodeName === 'Community WG') {
                            nodeX.push(specialWalletsX - 0.1);
                            nodeY.push(lastCommunityWGY = lastMetagovY + 0.08);
                        } else if (sender === 'DAO Wallet' && !specialWallets.hasOwnProperty(nodeName)) {
                            daoWalletRecipients.push(nodeName);
                            nodeX.push(0.95);
                            nodeY.push(lastDaoWalletY);
                            lastDaoWalletY += 0.3;
                        } else if (nodeName === 'Ecosystem') {
                            nodeX.push(specialWalletsX - 0.1);
                            nodeY.push(lastEcosystemY = lastDaoWalletY);
                            lastEcosystemSenderY = lastEcosystemY + 0.01;
                            interCatFlag = true;
                        } else if (sender === 'Ecosystem') {
                            if (interCatFlag) {
                                lastX = 0.95;
                                if (receiver.startsWith('Unspent')) {
                                    if (!unspentNodes.has(receiver)) {
                                        unspentNodes.add(receiver);
                                        nodeX.push(lastX);
                                        nodeY.push(lastEcosystemY);
                                    }
                                    return nodeIndices[receiver];
                                }
                                lastEcosystemY += 0.05;
                                interCatFlag = false;
                            }
                            nodeX.push(lastX);
                            nodeY.push(lastEcosystemY += 0.05);
                            ecosystemRecipients.push(nodeName);
                        } else if (nodeName === 'Public Goods') {
                            nodeX.push(specialWalletsX - 0.1);
                            nodeY.push(lastPublicGoodsY = lastEcosystemY + 0.08);
                            interCatFlag = true;
                        } else if (sender === 'Public Goods') {
                            if (interCatFlag) {
                                lastX = 0.95;
                                if (receiver.startsWith('Unspent')) {
                                    if (!unspentNodes.has(receiver)) {
                                        unspentNodes.add(receiver);
                                        nodeX.push(lastX);
                                        nodeY.push(lastPublicGoodsY);
                                    }
                                    return nodeIndices[receiver];
                                }
                                lastPublicGoodsY += 0.01;
                                interCatFlag = false;
                            }
                            nodeX.push(lastX);
                            nodeY.push(lastPublicGoodsY += 0.05);
                            publicGoodsRecipients.push(nodeName);
                        } else if (nodeName === 'Metagov') {
                            nodeX.push(specialWalletsX - 0.1);
                            nodeY.push(lastMetagovY = lastPublicGoodsY + 0.08);
                            lastMetagovSenderY = lastMetagovY;
                            interCatFlag = true;
                        } else if (sender === 'Metagov') {
                            if (interCatFlag) {
                                lastX = 0.95;
                                if (receiver.startsWith('Unspent')) {
                                    if (!unspentNodes.has(receiver)) {
                                        unspentNodes.add(receiver);
                                        nodeX.push(lastX);
                                        nodeY.push(lastMetagovY + 0.01);
                                    }
                                    return nodeIndices[receiver];
                                }
                                lastMetagovY += 0.02;
                                interCatFlag = false;
                            }
                            nodeX.push(lastX);
                            nodeY.push(lastMetagovY += 0.05);
                            metagovRecipients.push(nodeName);
                        } else if (nodeName === 'Community WG') {
                            interCatFlag = true;
                        } else if (sender === 'Community WG') {
                            nodeX.push(lastX);
                            nodeY.push(lastCommunityWGY += 0.04);
                            communityWGRecipients.push(nodeName);
                        } else if (nodeName === 'Plchld') {
                            nodeX.push(dummyNodeXY);
                            nodeY.push(dummyNodeXY);
                        } else if (sender === 'Plchld') {
                            nodeX.push(dummyNodeXY);
                            nodeY.push(dummyNodeXY);
                        }
                    } else if (quarter === '2024') {
                        if (nodeName === 'DAO Wallet') {
                            nodeX.push(daoWalletX);
                            nodeY.push(daoWalletY += 0.15);
                            lastDaoWalletY = daoWalletY;
                            lastDaoWalletY -= 0.2;
                        } else if (sender === 'DAO Wallet' && !specialWallets.hasOwnProperty(nodeName)) {
                            daoWalletRecipients.push(nodeName);
                            nodeX.push(0.95);
                            nodeY.push(lastDaoWalletY);
                            lastDaoWalletY += 0.25;
                        } else if (nodeName === 'Ecosystem') {
                            nodeX.push(specialWalletsX - 0.1);
                            nodeY.push(lastEcosystemY = lastDaoWalletY);
                            lastEcosystemSenderY = lastEcosystemY + 0.01;
                            interCatFlag = true;
                        } else if (sender === 'Ecosystem') {
                            if (interCatFlag) {
                                lastX = 0.95;
                                if (receiver.startsWith('Unspent')) {
                                    if (!unspentNodes.has(receiver)) {
                                        unspentNodes.add(receiver);
                                        nodeX.push(lastX);
                                        nodeY.push(lastEcosystemY);
                                    }
                                    return nodeIndices[receiver];
                                }
                                lastEcosystemY += 0.02;
                                interCatFlag = false;
                            }
                            nodeX.push(lastX);
                            nodeY.push(lastEcosystemY += 0.05);
                            ecosystemRecipients.push(nodeName);
                        } else if (nodeName === 'Public Goods') {
                            nodeX.push(specialWalletsX - 0.1);
                            nodeY.push(lastPublicGoodsY = lastEcosystemY + 0.08);
                            interCatFlag = true;
                        } else if (sender === 'Public Goods') {
                            if (interCatFlag) {
                                lastX = 0.95;
                                if (receiver.startsWith('Unspent')) {
                                    if (!unspentNodes.has(receiver)) {
                                        unspentNodes.add(receiver);
                                        nodeX.push(lastX);
                                        nodeY.push(lastPublicGoodsY);
                                    }
                                    return nodeIndices[receiver];
                                }
                                lastPublicGoodsY += 0.01;
                                interCatFlag = false;
                            }
                            nodeX.push(lastX);
                            nodeY.push(lastPublicGoodsY += 0.05);
                            publicGoodsRecipients.push(nodeName);
                        } else if (nodeName === 'Metagov') {
                            nodeX.push(specialWalletsX - 0.1);
                            nodeY.push(lastMetagovY = lastPublicGoodsY + 0.2);
                            lastMetagovSenderY = lastMetagovY;
                            interCatFlag = true;
                        } else if (sender === 'Metagov') {
                            if (interCatFlag) {
                                lastX = 0.95;
                                if (receiver.startsWith('Unspent')) {
                                    if (!unspentNodes.has(receiver)) {
                                        unspentNodes.add(receiver);
                                        nodeX.push(lastX);
                                        nodeY.push(lastMetagovY - 0.1);
                                    }
                                    return nodeIndices[receiver];
                                }
                                lastMetagovY += 0.05;
                                nodeX.push(lastX);
                                nodeY.push(lastMetagovY);
                                lastMetagovY += 0.08;
                                interCatFlag = false;
                            } else {
                                nodeX.push(lastX);
                                nodeY.push(lastMetagovY += 0.05);
                            }
                            metagovRecipients.push(nodeName);
                        } else if (nodeName === 'Community WG') {
                            interCatFlag = true;
                        } else if (sender === 'Community WG') {
                            nodeX.push(lastX);
                            nodeY.push(lastCommunityWGY += 0.04);
                            communityWGRecipients.push(nodeName);
                        } else if (nodeName === 'Providers') {
                            nodeX.push(specialWalletsX - 0.1);
                            if (quarter === '2024Q3') {
                                nodeY.push(lastSpsY = lastMetagovY + 0.15);
                            } else {
                                nodeY.push(lastSpsY = lastMetagovY + 0.08);
                            }
                            interCatFlag = true;
                        } else if (sender == 'Providers') {
                            if (interCatFlag) {
                                lastX = 0.95;
                                if (receiver.startsWith('Unspent')) {
                                    if (!unspentNodes.has(receiver)) {
                                        unspentNodes.add(receiver);
                                        nodeX.push(lastX);
                                        nodeY.push(lastSpsY - 0.02);
                                    }
                                    return nodeIndices[receiver];
                                }
                                lastSpsY += 0.05
                                interCatFlag = false;
                            }
                            nodeX.push(lastX);
                            nodeY.push(lastSpsY += 0.05);
                            spsRecipients.push(nodeName);
                        } else if (nodeName === 'Plchld') {
                            nodeX.push(dummyNodeXY);
                            nodeY.push(dummyNodeXY);
                        } else if (sender === 'Plchld') {
                            nodeX.push(dummyNodeXY);
                            nodeY.push(dummyNodeXY);
                        }
                    }
                } else {
                    pad = 15;
                }
            console.log(`Node ${nodeName}: X=${nodeX[nodeIndices[nodeName]]}, Y=${nodeY[nodeIndices[nodeName]]}`);
            qtrReceiversList = ecosystemRecipients.concat(publicGoodsRecipients, metagovRecipients, communityWGRecipients, spsRecipients, daoWalletRecipients)
            qtrSendersList = ecosystemSenders.concat(publicGoodsSenders, metagovSenders, communityWGSenders, spsSenders)
        }
        return nodeIndices[nodeName];
        }
    };

    // final methods of df processing
    df.forEach(row => {
        if (!categoryToNames[row.To_category]) {
            categoryToNames[row.To_category] = new Set();
        }
        categoryToNames[row.To_category].add(row.To_name);
    });

    df.forEach(row => {
        const dollarValue = Math.round(row.DOT_USD, 0);
        const formattedDollarValue = dollarValue.toLocaleString('en-US') + '$';
        const sender = row.From_category;
        const qtr = row.Quarter;
        const receipt = qtr === null 
        ? (row['Transaction Hash'] === 'Unspent' 
            ? 'Interquarter' 
            : row['Transaction Hash']) 
        : row['Transaction Hash'];

        let receiver = row.To_category;
        if (bigPicture && hideMode && row.To_category === 'Airdrop' && row['Transaction Hash'] !== '0xb7e613cfa0bcc27379c6c937c7df32b2540a07b71a7bac8a12d55934073bd61f') {
            receiver = null; 
        }

        const color = bigPicture && (row['To_name'] === 'DAO Wallet' || row['To_name'] === 'Endowment') && (hideMode) 
        ? colorHideModeMap[row.Symbol] 
        : colorMap[row.Symbol];

        const rawValue = (row.Symbol === 'ENS' || row.Symbol === 'USDC')
        ? Math.round(row.Value, 0) 
        : Math.round(row.Value, 2);

        const label = row.Symbol !== 'USDC'
        ? (row['Transaction Hash'] === 'Interquarter' || row['Transaction Hash'] === 'Unspent' 
           ? `Date: ${row.Date}<br>Amount: ${rawValue} ${row.Symbol}`
           : `Date: ${row.Date}<br>Amount: ${rawValue} ${row.Symbol} <br>Value: ${formattedDollarValue}`)
        : `Date: ${row.Date}<br>Value: ${rawValue} ${row.Symbol}`

        const customDataDateArray = row.Date;
        const customDataValueArray = rawValue;
        const customDataSymbolArray = row.Symbol;
        const customDataUSDArray = formattedDollarValue;
        const customDataToArray = row.To_name;
        const customDataFromArray = row.From_name;
        const customDataQtrArray = row.Quarter;
        const customDataAddrArray = row.To;

        if (bigPicture) {
            if (receiver !== null) {
                const specialReceipts = [
                    '0xf40e1c129ab1d20576a4a6776b16624e0a7d08d492b2433a214127e45584121d',
                    '0x9bf05272c1debfd466109f0dc99f6aac323934ee04b92a8cffb8720ff8bbf0c1'
                ];
                
                const isSpecialReceipt = specialReceipts.includes(receipt);
                const specialWallets = ['Ecosystem', 'Public Goods', 'Metagov', 'Community WG', 'Providers'];

                const value = (hideMode 
                ? (row['To_name'] === 'DAO Wallet'
                    ? Math.log(dollarValue) 
                    : row['From_name'] == 'DAO Wallet' && (row['Transaction Hash'] == 'Interquarter' || isSpecialReceipt)  
                        ? Math.log(dollarValue) 
                        : row['From_name'] == 'DAO Wallet' && (row['Transaction Hash'] == 'Interquarter' || isSpecialReceipt) 
                            ? Math.log(dollarValue) 
                            : row['From_name'] == 'Old Registrar' 
                                ? Math.log(dollarValue) 
                                : row['From_name'] == 'New Registrar' 
                                    ? Math.log(dollarValue) 
                                    : row['To_name'] == 'Endowment' 
                                        ? Math.log(dollarValue) 
                                        : row['From_name'] !== 'Plchld' 
                                            ? dollarValue : 1) 
                : row['From_name'] !== 'Plchld' ? dollarValue : 1)


                const qtr = row['From_name'] !== 'Plchld' 
                ? row.Quarter 
                : 'Plchld';

                const nextQuarter = (row['Transaction Hash'] === 'Interquarter' || isSpecialReceipt) 
                ? getNextQuarter(qtr) 
                : qtr;

                let senderNodeName = `${sender} (${qtr})`;
                let receiverNodeName = `${receiver} (${nextQuarter})`;

                if (specialWallets.includes(sender) && !(specialWallets.includes(receiver))) {
                    receiverNodeName = `${receiver} (${nextQuarter})${sender.substring(0, 2)}`;
                }

                if (sender === 'Dissolution') {
                    receiverNodeName = "Community SG (2022Q3)Ec"
                }
                const senderIndex = getNodeIndex(senderNodeName, sender, receiver, model, qtr);
                const receiverIndex = getNodeIndex(receiverNodeName, sender, receiver, model, nextQuarter);

                if (row.To_name.endsWith('Swap') || row.From_name.endsWith('Swap') || row.To_name === 'CoW' || row.From_name === 'CoW') {
                    const swapInfo = {
                        date: row.Date,
                        value: rawValue,
                        symbol: row.Symbol,
                        receipt: row['Transaction Hash']
                    };
                    
                    if (row.To_name.endsWith('Swap') || row.To_name === 'CoW') {
                        if (!nodeSwapInfo[senderNodeName]) nodeSwapInfo[senderNodeName] = [];
                        swapInfo.value = swapInfo.value * -1;
                        nodeSwapInfo[senderNodeName].push(swapInfo);
                    } else if (row.From_name.endsWith('Swap') || row.From_name === 'CoW')  {
                        if (!nodeSwapInfo[receiverNodeName]) nodeSwapInfo[receiverNodeName] = [];
                        nodeSwapInfo[receiverNodeName].push(swapInfo);
                    }
                }

                nodeSenderSafeExport.push(sender);

                linkSources.push(senderIndex);
                linkTargets.push(receiverIndex);
                linkValues.push(value);
                linkColors.push(color);
                linkReceipts.push(receipt);
                linkLabels.push(label);

                linkCustomDataDate.push(customDataDateArray);
                linkCustomDataValue.push(customDataValueArray);
                linkCustomDataSymbol.push(customDataSymbolArray);
                linkCustomDataUSD.push(customDataUSDArray);
                linkCustomDataTo.push(customDataToArray);
                linkCustomDataFrom.push(customDataFromArray);
                linkCustomDataQtr.push(customDataQtrArray);
                linkCustomDataAddr.push(customDataAddrArray);

                return;
            }

        } else if (!bigPicture) {
            const senderIndex = getNodeIndex(sender, sender, receiver, model, qtr);
            const receiverIndex = getNodeIndex(receiver, sender, receiver, model, qtr);
            const value =                         
            row['From_name'] == 'Old Registrar' 
            ? dollarValue / 100 
            : row['From_name'] == 'New Registrar' 
                ? dollarValue / 100 
                : row['To_name'] == 'Endowment' 
                    ? dollarValue / 25 
                    : dollarValue;
    
            if (senderIndex !== -1 && receiverIndex !== -1) {
                linkSources.push(senderIndex);
                linkTargets.push(receiverIndex);
                linkValues.push(value);
                linkColors.push(color);
                linkReceipts.push(receipt);
                linkLabels.push(label);

                linkCustomDataDate.push(customDataDateArray);
                linkCustomDataValue.push(customDataValueArray);
                linkCustomDataSymbol.push(customDataSymbolArray);
                linkCustomDataUSD.push(customDataUSDArray);
                linkCustomDataTo.push(customDataToArray);
                linkCustomDataFrom.push(customDataFromArray);
                linkCustomDataQtr.push(customDataQtrArray);
                linkCustomDataAddr.push(customDataAddrArray);
            }
            return;
        }
    });

    let conditions = {
        condition1: condition1 ? '+' : '-',
        condition2: condition2 ? '+' : '-',
        condition3: condition3 ? '+' : '-',
        model: model,
        quarterCount: quarterCount
    };
    safeYAxisExport.push(nodeY);
    const maxY = Math.max(...safeYAxisExport[0])  
    const customPad = pad;

    return {
        nodes: nodes.map((node, index) => {
            let nodeName = node.startsWith('Unspent_') ? node.split('_')[2] : node.split(' (')[0];
            const bpNodeName = node;
            const toNames = categoryToNames[nodeName] ? Array.from(categoryToNames[nodeName]) : [];
            return { 
                name: nodeName, 
                customdata: { 
                    account: nodeCustomdata[index],
                    bpIndex: bpNodeName,
                    sender: nodeSenderSafeExport[index],
                    toNames: toNames,
                    swaps: nodeSwapInfo[bpNodeName] || []
                },
                color: nodeColors[index], 
                x: nodeX[index], 
                y: nodeY[index],
                bpIndex: bpNodeName,
            };
        }),
        links: linkSources.map((source, index) => ({
            source: source,
            target: linkTargets[index],
            value: linkValues[index],
            color: linkColors[index],
            label: linkLabels[index],
            customdata: {
                receipt: linkReceipts[index],
                date: linkCustomDataDate[index],
                value: linkCustomDataValue[index],
                symbol: linkCustomDataSymbol[index],
                usd: linkCustomDataUSD[index],
                to: linkCustomDataTo[index],
                from: linkCustomDataFrom[index],
                qtr: linkCustomDataQtr[index],
                addr: linkCustomDataAddr[index]
            },
        })),

        conditions: conditions,
        model: model,
        zoneSendersList: zoneSendersList,  
        qtrSendersList: qtrSendersList,
        qtrReceiversList: qtrReceiversList,
        maxY: maxY,
        pad: customPad
    };
}