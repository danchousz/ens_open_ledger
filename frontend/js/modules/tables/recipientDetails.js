import { getEtherscanLink, formatValue, groupDataByField } from '../../services/utils.js';
import { loadAllAvatars } from '../../services/loadAvatar.js';
import { exportTableByEntity } from '../../services/exportChart.js';
import { colorMap, isDesktop, specialWallets } from '../globalVars.js';
import { drawTablePieChart } from '../pie/tablePie.js';
import { navigator } from '../navigator.js';

async function checkInvoiceExists(txHash, address) {
    try {
        const response = await fetch(`/api/check-invoice/${txHash}/${address}`);
        const data = await response.json();
        return data.exists ? data.url : null;
    } catch (error) {
        console.error('Error checking invoice:', error);
        return null;
    }
}

export function showRecipientDetails(recipientName, isCategory) {
    const isSpecialWallet = specialWallets.includes(recipientName);

    if (recipientName === 'DAO Wallet') {
        return;
    }

    navigator.setRecipientDetails(recipientName);

    fetch(`/recipient_details/${encodeURIComponent(recipientName)}?isCategory=${isCategory}&isSpecialWallet=${isSpecialWallet}`)
    .then(async response => response.json())
    .then(async data => {
        if (!data.transactions || data.transactions.length === 0) {
            return;
        }

        data.transactions.sort((a, b) => new Date(b.Date) - new Date(a.Date));

        const tableHeaders = isSpecialWallet
            ? ['Date', 'Amount', 'USD Value', 'Category', 'Address', 'To', 'TX']
            : (isCategory
                ? ['Date', 'Amount', 'USD Value', 'From', 'Address', 'Counterparty', 'TX']
                : ['Date', 'Amount', 'USD Value', 'From', 'Address', 'Item', 'TX']);

        const invoiceChecks = data.transactions.map(tx => 
            checkInvoiceExists(tx['Transaction Hash'], tx['To'])
        );

        const invoiceUrls = await Promise.all(invoiceChecks);

        const tableRows = data.transactions.map((tx, index) => {
            const txLink = `<a href="${getEtherscanLink(tx['Transaction Hash'])}" target="_blank" style="color: #2f7cff; text-decoration: none;">${tx['Transaction Hash'].substring(0, 6)}...</a>`;

            const invoiceUrl = invoiceUrls[index];
            const invoiceLink = invoiceUrl 
                ? `<br><a href="${invoiceUrl}" target="_blank" style="color: #2f7cff; text-decoration: none; font-weight: bold;">Legal Invoice</a>` 
                : '';
            
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
                <td>${txLink}${invoiceLink}</td>
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

        function createPieChartHtml(title, data, isSpecial) {
            const chartId = `pieChart${title}`;
            const widthStyle = isSpecial ? '40%' : '28%';
            return `
                <div style="width: ${widthStyle}; display: flex; flex-direction: column; align-items: center;">
                    <h4 style="text-align: center; margin: 0 0 0.71vw 0; font-size: 14px">${title}</h4>
                    <div style="width: 100%; aspect-ratio: 1 / 1; position: relative;">
                        <canvas id="${chartId}"></canvas>
                    </div>
                </div>
            `;
        }

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
                    
                    button.onclick = () => exportTableByEntity(format.toLowerCase(), data.transactions, recipientName);
                    saveButtonsContainer.appendChild(button);
                });
            detailsContent.appendChild(saveButtonsContainer);
        }
        recipientDetailsDiv.style.display = 'block';

        drawTablePieChart('pieChartQuarter', quarterData);
        drawTablePieChart(`pieChart${isSpecialWallet ? 'Counterparties' : (isCategory ? 'Counterparties' : 'Category')}`, counterpartiesData);
        if (!isSpecialWallet) {
            drawTablePieChart('pieChartSender', senderData);
        }
        setTimeout(() => {
            loadAllAvatars();
        }, 100);
        })
    .catch(error => {
        console.error('Error fetching recipient details:', error);
    });
}