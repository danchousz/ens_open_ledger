import fs from 'fs';
import path from 'path';

const STORAGE_PATH = new URL('./subscribers.json', import.meta.url).pathname;

const ensureDirectoryExists = () => {
    const dir = path.dirname(STORAGE_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

class SubscriberStorage {
    constructor() {
        this.subscribers = new Map();
        this.loadSubscribers();
    }

    loadSubscribers() {
        try {
            ensureDirectoryExists();
            if (fs.existsSync(STORAGE_PATH)) {
                const data = fs.readFileSync(STORAGE_PATH, 'utf8');
                const parsed = JSON.parse(data);
                this.subscribers = new Map(parsed);
            } else {
                this.saveSubscribers();
            }
        } catch (error) {
            console.error('Error loading subscribers:', error);
            this.subscribers = new Map();
        }
    }

    saveSubscribers() {
        try {
            ensureDirectoryExists();
            const data = JSON.stringify([...this.subscribers]);
            fs.writeFileSync(STORAGE_PATH, data);
        } catch (error) {
            console.error('Error saving subscribers:', error);
        }
    }

    addSubscriber(chatId) {
        this.subscribers.set(String(chatId), {
            subscribedAt: new Date().toISOString(),
            lastNotified: null
        });
        this.saveSubscribers();
    }

    removeSubscriber(chatId) {
        this.subscribers.delete(String(chatId));
        this.saveSubscribers();
    }

    isSubscribed(chatId) {
        return this.subscribers.has(String(chatId));
    }

    getAllSubscribers() {
        return Array.from(this.subscribers.keys()).map(Number);
    }

    updateLastNotified(chatId) {
        const subscriber = this.subscribers.get(String(chatId));
        if (subscriber) {
            subscriber.lastNotified = new Date().toISOString();
            this.saveSubscribers();
        }
    }
}

export const subscriberStorage = new SubscriberStorage();