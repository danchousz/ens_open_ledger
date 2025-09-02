import fetch from 'node-fetch';
import { config } from '../../config/cfg.mjs';

export class ApiService {
    constructor(baseUrl = config.API_URL, options = {}) {
        this.baseUrl = baseUrl;
        this.timeout = options.timeout || 30000;
        this.retries = options.retries || 3;
    }

    async handleApiError(response) {
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`API Error: ${response.status} ${text}`);
        }
        return response.json();
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        let lastError;
        
        for (let attempt = 0; attempt < this.retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);
                
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                return await this.handleApiError(response);
            } catch (error) {
                lastError = error;
                if (attempt < this.retries - 1) {
                    await this.delay(Math.pow(2, attempt) * 1000);
                }
            }
        }
        
        throw lastError;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getTransactions() {
        return this.request('/api/telegram/transactions');
    }

    async getRecipientDetails(identifier) {
        return this.request(`/api/telegram/recipient/details/${encodeURIComponent(identifier)}`);
    }

    async searchRecipients(searchText) {
        return this.request(`/api/telegram/search?term=${encodeURIComponent(searchText)}`);
    }

    async getTransactionByHash(hash) {
        return this.request(`/api/telegram/transaction/${hash}`);
    }

    async getQuarters(category) {
        return this.request(`/api/telegram/quarters/${category}`);
    }

    async getYears(category) {
        return this.request(`/api/telegram/years/${category}`);
    }

    async exportData(category, period, format) {
        const response = await fetch(`${this.baseUrl}/api/telegram/export/${category}/${period}/${format}`);
        if (!response.ok) {
            throw new Error(`Export failed: ${response.status}`);
        }
        return response.arrayBuffer();
    }

    async exportRecipientData(recipient, format) {
        const response = await fetch(`${this.baseUrl}/api/telegram/recipient/export/${encodeURIComponent(recipient)}/${format}`);
        if (!response.ok) {
            throw new Error(`Export failed: ${response.status}`);
        }
        return response.arrayBuffer();
    }
}