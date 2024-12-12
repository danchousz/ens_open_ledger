import { addOpenBanner, removeOpenBanner } from "../globalStates.js";
import { isDesktop } from "../globalVars.js";


async function checkInvoiceExists(txHash, address) {
    try {
        const url = address 
            ? `/api/check-invoice/${txHash}/${address}`
            : `/api/check-invoice/${txHash}`;
            
        const response = await fetch(url);
        const data = await response.json();
        return data.exists ? data.url : null;
    } catch (error) {
        console.error('Error checking invoice:', error);
        return null;
    }
}

// This part of the code causes pop-up banners to appear with brief information about the transaction made
// or the amount of tokens transferred to the next reporting period.
export async function createFlowBanner(flowInfo, etherscanUrl, txHash, address) {
    const container = document.getElementById('flowBannerContainer');
    const banner = document.createElement('div');
    banner.className = 'flow-banner';
    banner.id = `flowBanner-${txHash}`;    

    const bannerTextStyle = isDesktop 
    ? 'font-size: 1vw'
    : 'font-size: 1.3vh; margin-bottom: 10px;';

    const invoiceUrl = await checkInvoiceExists(txHash, address);

    let linksHtml = '';
    if (etherscanUrl) {
        linksHtml = `<a class="typography" href="${etherscanUrl}" target="_blank" style="${bannerTextStyle}">View on Etherscan</a>`;
        
        if (invoiceUrl) {
            linksHtml += ` | <a class="typography" href="${invoiceUrl}" target="_blank" style="${bannerTextStyle}">Legal Invoice</a>`;
        }
    }

    if (etherscanUrl) {
        banner.innerHTML = `
            <span class="close-button">&times;</span>
            <div class="typography--medium" style="${bannerTextStyle}">${flowInfo}</div>
            ${linksHtml}
        `;
    } else {
        banner.innerHTML = `
        <span class="close-button">&times;</span>
        <div class="typography--medium" style="${bannerTextStyle}">${flowInfo}</div>
    `;
    }

    container.appendChild(banner);

    // Removes by timer or by clicking the close button
    setTimeout(() => {
        banner.classList.add('show');
    }, 10);

    addOpenBanner(txHash);

    setTimeout(function() {
        banner.classList.remove('show');
        setTimeout(() => {
            banner.remove();
            removeOpenBanner(txHash);
        }, 300);
    }, 10000)

    const closeButton = banner.querySelector('.close-button');
    closeButton.addEventListener('click', function() {
        banner.classList.remove('show');
        setTimeout(() => {
            banner.remove();
            removeOpenBanner(txHash);
        }, 300);
    });
}

// When opened, the banner gets a unique ID. If you click again at the same, there will be a shaking animation.
export function shakeBanner(txHash) {
    const banner = document.getElementById(`flowBanner-${txHash}`);
    if (banner) {
        banner.classList.add('shake');
        banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        setTimeout(() => {
            banner.classList.remove('shake');
        }, 820); 
    }
}