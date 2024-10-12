import { spendingLinksDictionary, requestLinksDictionary } from './reportDicts.js';
import { navigator, updateContextButton } from '../navigator.js';
import { formatValue, getMonthRange, getEtherscanLink } from '../../services/utils.js';
import { showRecipientDetails } from '../tables/recipientDetails.js';
import { getSideMenuState } from '../globalStates.js';
import { specialWallets, isDesktop } from '../globalVars.js';

// This part of the code calls the universal dropdown.
// For DAO wallets, it opens a mini-table with a report on funds received, spent, transferred from the previous and transferred to the next reporting part.
export function showContractorsDropdown(category, clickX, clickY, categoryIndex, categoryValue, sender, layout, isSpecial, interquarterOutArgs, interquarterInArgs, sumInArgs, sumOutArgs, swaps) {

    // category – Node label
    // clickX, clickY – Coordinates of the dropdown click
    // categoryIndex – Unique identifier of the category (e.g., 'Ecosystem (2022Q3)')
    // categoryValue – The total amount entering category in USD
    // sender – Divides the category into recipient zones. For example, 'Salaries 2022Q2' has Ecosystem and Metagov as a Sender. Thanks to this parameter, we split these money flows
    // layout – width/height of the sankey layout
    // isSpecial – Boolean flag indicating if the dropdown is for a special wallet (e.g., Ecosystem)
    // interquarterOutArgs, interquarterInArgs, sumInArgs, sumOutArgs – Data for special wallets – how much received, sent, unspent; Order: USDC, ENS, ETH
    // swaps – A list containing information about swaps (e.g. with Uniswap) for working group wallets.

    if (category === 'DAO Wallet') {
        return;
    }

    const dropdown = document.getElementById('contractorsDropdown');
    const title = document.getElementById('dropdownTitle');
    const list = document.getElementById('contractorsList');
    const options = document.getElementById('chartOptions');

    const isSideMenuExpanded = getSideMenuState();
    let formattedTitle;

    // Special wallets = wallets of the DAO (All WGs and SGs) w/o DAO Wallet
    // We dont open the dropdown if in wallet display for special wallets
    if (navigator.walletFilter && specialWallets.includes(category)) {
        showRecipientDetails(category, false);
        return;
    }

    function parseCategoryIndex(categoryIndex) {
        const match = !navigator.currentYear 
            ? categoryIndex.match(/(.+) \((\d{4})Q(\d)\)/)
            : categoryIndex.match(/(.+) \((\d{4})\)/);
        if (match) {
            return {
                walletName: match[1],
                year: match[2],
                quarter: match[3]
            };
        }
        return null;
    }

    // Making 'Jan-Mar' titles instead of 'YYYYxQy'
    const quarterInfo = parseCategoryIndex(categoryIndex);
    const monthRange = (!navigator.currentYear) 
        ? getMonthRange(quarterInfo.quarter)
        : ''

    // Making '10k' titles instead of '10000'
    const formattedCategoryValue = formatValue(categoryValue, null, null, true);

    const timeframeURL = !navigator.currentYear
        ? `${quarterInfo.year}Q${quarterInfo.quarter}`
        : `${navigator.currentYear}`;

    let url = `/contractors/${encodeURIComponent(category)}?quarter=${timeframeURL}`;

    if (sender) {
        url += `&sender=${encodeURIComponent(sender)}`;
    }

    fetch(url)
    .then(response => response.json())
    .then(contractors => {
        // Prevent opening dropdown for '2022' or '2022Q2' unspent nodes
        if (!isSpecial) {
            if (contractors[0].name.match(/\d{4}/) || contractors[0].name.match(/^\d{4}$/)) {
                return
            }
        }
        list.innerHTML = '';
        const chartButtonHTML = (!isSpecial && contractors.length === 1 && contractors[0].name === category)
            ? ''
            : `<button id="chartButton" style="align-self: start;" class="category-chart-button">
                    <img src="/components/icons/SankeyChartIcon.png" alt="Category chart icon">
                    <div style="color: black; font-family: satoshi; font-size: ${isDesktop ? '1.14vw' : '5.5vw'}; align-self: center;">Detailed Sankey Chart</div>
                </button>`
        const detailsButtonHTML = `
                <button id="detailsButton" style="align-self: start;" class="category-chart-button">
                    <img src="/components/icons/ChartIcon.png" alt="Category chart icon">
                    <div style="color: black; font-family: satoshi; font-size: ${isDesktop ? '1.14vw' : '5.5vw'}; align-self: center;">See All-Time Statistics</div>
                </button>`
        // We don't add the internal column in any display but Big_picture
        const internalColumn = !isSpecial 
        ? ''
        : navigator.currentView === 'big_picture'
            ? `<div class="column">
                    <div class="column-header">Internal</div>
                    ${generateSummarySection('BROUGHT FORWARD', interquarterInArgs, categoryIndex)}
                    ${generateSummarySection('CARRIED DOWN', interquarterOutArgs, categoryIndex)}
                </div>`
            : ''

        if (!isSpecial) {
            dropdown.style.width = 'fit-content';
            if (navigator.currentView === 'quarter' || navigator.currentView === 'wallet') {
                if (isDesktop) {
                    dropdown.style.maxHeight = '37.5vh';
                }
            } else if (navigator.currentView === 'year') {
                if (isDesktop) {
                    dropdown.style.maxHeight = '62.5vh';
                }
            } else {
                dropdown.style.flexDirection = 'column-reverse'
            }
            title.innerHTML = `
                <div class="title-container">
                    <span class="category-title" style="font-size: ${isDesktop ? '1.7vw' : '13vw'}">${category}</span>
                </div>
                <hr>
                <div class="short-summ-container">
                    <div style="font-size: ${isDesktop ? '1vw' : '4vw'}; /* margin-bottom: 0px; */ /* margin: 0px; */ font-weight: 500;">RECEIVED</div>
                    <div style="font-size: ${isDesktop ? '2.3vw' : '10vw'}; /* letter-spacing: 0.2vw; */ margin-top: 0; /* font-weight: 400; */ margin-top: ${isDesktop ? '-0.6vh' : '-1vh'};">${formattedCategoryValue}</div>
                    <div style="color: grey; font-size: ${isDesktop ? '0.9vw' : '4vw'}; font-weight: 400; margin-top: ${isDesktop ? '-0.6vh' : '-1vh'};">${!navigator.currentYear ? getMonthRange(quarterInfo.quarter) : ''} ${!navigator.currentYear ? quarterInfo.year : navigator.currentYear}</div>
                </div>
                <hr>
            `;
            options.innerHTML = `
                ${chartButtonHTML}
                ${detailsButtonHTML}
                <hr>
            `;
        } else {
            if (navigator.currentView === 'big_picture') {
                if (isDesktop) {
                    dropdown.style.width = '40vw';
                    dropdown.style.maxHeight = '100vh';
                    dropdown.style.flexDirection = 'column-reverse'
                }
                formattedTitle = `${quarterInfo.walletName} (${monthRange} ${quarterInfo.year})`;
            } else {
                if (isDesktop) {
                    dropdown.style.width = 'fit-content';
                    dropdown.style.maxHeight = '75vh';
                }
            }
            title.innerHTML = `
                <div class="title-container">
                    <span class="category-title">${navigator.currentView === 'big_picture' ? formattedTitle : category}</span>
                </div>
                <hr style="color: #ddd;">
                <div class="dropdown-content">
                    ${internalColumn}
                    <div class="column" style="width: ${navigator.currentView === 'big_picture' ? '48%' : 'unset'}; min-width: ${navigator.currentView === 'big_picture' ? '48%' : '100%'}"}">
                        <div class="column-header">External</div>
                        ${generateSummarySection('RECEIVED', sumInArgs, 'Funding Request', categoryIndex)}
                        ${generateSummarySection('SENT', sumOutArgs, 'Spending Summary', categoryIndex)}
                    </div>
                </div>
                ${generateSwapsSection(swaps)}
            `;
            options.innerHTML = `
                    ${chartButtonHTML}
                    ${detailsButtonHTML}
                `;
        }

        const chartOption = document.getElementById('chartButton');
        const detailsOption = document.getElementById('detailsButton');

        // chartOption opens a deeper display
        if (chartOption) {
            chartOption.onclick = function(e) {
                if (specialWallets.includes(category)) {
                    e.stopPropagation();
                    dropdown.style.display = 'none';
                    navigator.currentYear
                        ? navigator.setYear(`${navigator.currentYear}`, true)
                        : navigator.setQuarter(`${quarterInfo.year}Q${quarterInfo.quarter}`, true)
                    navigator.setWalletFilter(category);
                } else {
                    e.stopPropagation();
                    dropdown.style.display = 'none';
                    navigator.currentYear
                        ? navigator.setCategoryView(`${navigator.currentYear}`, category)
                        : navigator.setCategoryView(`${quarterInfo.year}Q${quarterInfo.quarter}`, category);
                    updateContextButton();
                }
            }
        }

        // detailsOption opens recipient table
        detailsOption.onclick = function(e) {
            e.stopPropagation();
            dropdown.style.display = 'none';
            return showRecipientDetails(category, true);
        }

        contractors.sort((a, b) => b.value - a.value);
        const groupedContractors = contractors.reduce((acc, contractor) => {
            const thru = contractor.thru;
            if (!acc[thru]) {
                acc[thru] = [];
            }
            acc[thru].push(contractor);
            return acc;
        }, {});

        // Adding the list of contractors within a category
        if (!isSpecial) {
            const thruOrder = ['Direct', ...Object.keys(groupedContractors).filter(key => key !== 'Direct')];
            thruOrder.forEach(thru => {
                if (groupedContractors[thru]) {
                    const header = document.createElement('div');
                    header.textContent = thru !== 'Direct' ? `Through ${thru}` : 'Direct';
                    header.className = 'contractor-header';
                    header.style.fontWeight = '500';
                    if (isDesktop) {
                        header.style.paddingBottom = '1.25vh';
                        header.style.borderBottom = '0.071vw solid grey';
                        header.style.textAlign = 'center';
                        header.style.fontSize = '1.5vw';
                    } else {
                        header.style.paddingBottom = '1.25vh';
                        header.style.borderBottom = '0.071vw solid grey';
                        header.style.textAlign = 'center';
                        header.style.fontSize = '7.5vw';
                    }
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
                        img.style.width = '10vw';
                        img.style.height = '10vw';
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

        // Positions dropdown on diagram Layout    
        dropdown.style.display = 'block';
        const dropdownRect = dropdown.getBoundingClientRect();

        let left;
        
        if (navigator.currentView === 'big_picture') {
            left = Math.min(clickX, layout.width - dropdownRect.width);
        } else if (navigator.currentView === 'quarter'){
            if (!isSideMenuExpanded) {
                left = 0.915*layout.width - dropdownRect.width;
            } else {
                left = 0.98*layout.width;
            }
        } else if (navigator.currentView === 'wallet') {
            if (isSideMenuExpanded) {
                left = layout.width - dropdownRect.width + window.innerWidth*0.225;
            } else {
                left = layout.width - dropdownRect.width
            }
        } else {
            if (!isSideMenuExpanded) {
                left = 0.915*layout.width - dropdownRect.width;
            } else {
                left = 0.98*layout.width;
            }
        }

        // Logic of reversing dropdown direction based on click position
        let top = clickY;
        if (isDesktop) {
            const isReversed = navigator.currentView === 'wallet' || navigator.currentView === 'big_picture'
            ? true 
            : (navigator.currentView === 'quarter' 
                ? clickY > layout.height * 0.8 || (dropdownRect.height > clickY/layout.height*0.5 && clickY > layout.height * 0.75)
                : clickY > layout.height * 0.8 || (dropdownRect.height > clickY/layout.height*0.6 && clickY > layout.height * 0.85));
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

            if (navigator.currentView === 'big_picture' || !isSpecial) {
                dropdown.style.left = `${left}px`;
                dropdown.style.top = `${top}px`;
                dropdown.style.transform = 'none';
            } else {
                dropdown.style.left = `50%`;
                dropdown.style.top = `40%`;
                dropdown.style.transform = 'translate(-50%, -50%)';
            }
        } else {
            dropdown.style.display = 'flex';
            dropdown.style.position = 'fixed';
            dropdown.style.left = `50%`;
            dropdown.style.top = `50%`;
            dropdown.style.transform = 'translate(-50%, -50%)';
            dropdown.style.width = '95%';
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

function generateValueDivs(arr) {
    if (!arr || arr.every(value => value === '')) {
        return '<div>Nothing</div>';
    }
    return arr.map(value => `<div>${value}</div>`).join('');
}

function generateSummarySection(title, values, linkType, categoryIndex) {
    let linkHtml = '';
    if (linkType && (title === 'RECEIVED' || title === 'SENT')) {
        const link = linkType === 'Spending Summary'
        ? spendingLinksDictionary[categoryIndex] ? spendingLinksDictionary[categoryIndex] : ''
        : requestLinksDictionary[categoryIndex] ? requestLinksDictionary[categoryIndex] : '';
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