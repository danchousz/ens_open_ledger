import { getEtherscanLink, formatValue } from '../../services/utils.js'
import { colorMap } from '../globalVars.js'

function saveTransaction(transactionData) {
    fetch('/save_transaction', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
}

export function loadTransactions() {
    fetch('/unknown_contractors')
    .then(response => response.json())
    .then(data => {
        const transactionsTable = document.getElementById('transactionsTable').getElementsByTagName('tbody')[0];
        if (data.length === 0) {
            const row = transactionsTable.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 8; // Span across all columns
            cell.textContent = "Data up to date";
            cell.style.textAlign = "center";
            return;
        }
        transactionsTable.innerHTML = '';
        data.forEach(tx => {
            const row = transactionsTable.insertRow();
            const isAcquainted = tx['Acquainted?'] === 1;
            row.innerHTML = `
                <td>${tx.Date}</td>
                <td><a href="${getEtherscanLink(tx['Transaction Hash'])}" target="_blank">${tx['Transaction Hash'].substring(0, 6)}...</a></td>
                <td>
                    <span style="color: ${colorMap[tx.Symbol]}; font-weight: bold;">
                        ${formatValue(-tx.Value, 0, 2)} ${tx.Symbol}
                    </span>
                </td>
                <td>${tx['From_name']}</td>
                <td>${tx.To}</td>
                <td>${isAcquainted ? tx.To_name : '<input type="text" class="name-input">'}</td>
                <td>${isAcquainted ? tx.To_category : '<input type="text" class="category-input">'}</td>
                <td>
                    <div class="button--submit">Submit</div>
                    <span class="checkmark" style="display: none;">✓</span>
                </td>
            `;

            const submitButton = row.querySelector('.button--submit');
            const checkmark = row.querySelector('.checkmark');
            submitButton.addEventListener('click', function() {
                const nameInput = row.querySelector('.name-input');
                const categoryInput = row.querySelector('.category-input');
                const name = isAcquainted ? tx.To_name : nameInput.value;
                const category = isAcquainted ? tx.To_category : categoryInput.value;

                saveTransaction({
                    Hash: tx['Transaction Hash'],
                    From: tx['From_name'],
                    Amount: -tx.Value,
                    Address: tx.To,
                    Name: name,
                    Category: category
                });

                checkmark.style.display = 'inline';
                submitButton.style.display = 'none';
            });
        });
    })
    .catch(error => console.error('Error loading transactions:', error));
}