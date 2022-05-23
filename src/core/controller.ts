import axios from 'axios';
import log from 'loglevel';
import { writeFile } from 'fs/promises';
import { Document, Socket, Storage } from '../lib';
import { Config, Tab } from '../shared/types';
import Protocol from 'devtools-protocol';

class Controller {
    port: number;
    retries: number;
    maxRetries: number;
    socket: Socket;
    requestId: number;
    document: Document | null;
    storage: Storage | null;

    constructor({ port, maxRetries, debug, silent }: Config) {
        this.port = port;
        this.retries = 0;
        this.maxRetries = maxRetries || 3;
        this.socket = new Socket();
        this.requestId = 0;
        this.document = null;
        this.storage = null;

        log.setLevel(debug ? 'debug' : silent ? 'silent' : 'info');
    }

    private waitForTabId() {
        if (this.retries >= this.maxRetries)
            return Promise.reject();

        return new Promise<string>((resolve, reject) => {
            this.retries++;
            setTimeout(async () => {
                try {
                    const { data }: { data: Tab[] } = await axios.get(`http://localhost:${this.port}/json`);                    
                    const tab = data.find(({ type, url }) => type === 'page' && url === 'chrome://newtab/');
                    tab ? resolve(tab.id) : reject();
                } catch (e) {
                    log.error('Retry connecting...');
                    log.debug(e);
                    return this.waitForTabId();
                }
            }, 1000);
        });
    }

    async connect() {
        try {
            log.info('Controller connecting...');

            const tabId = await this.waitForTabId();
            const wsUrl = `ws://localhost:${this.port}/devtools/page/${tabId}`;

            await this.socket.connect(wsUrl);
            await this.socket.send('Page.enable');
            await this.socket.send('DOM.enable');
            await this.socket.send('DOMStorage.enable');

            log.info('Controller connected.');
        } catch(e) {
            log.error('Failed to connect to instance.');
            log.debug(e);
        }
    }

    async disconnect() {
        await this.socket.send('Page.disable');
        await this.socket.send('DOM.disable');
        await this.socket.send('DOMStorage.disable');
        this.socket.close();

        log.info('Controller disconnected.');
    }

    navigate(url: string) {
        if (typeof url !== 'string')
            throw new Error('argument must be a string');

        try {
            return new Promise<void>(async (resolve, reject) => {
                const { frameId } = await this.socket.send('Page.navigate', {
                    url
                });

                const onFrameStoppedLoading = async (event: Protocol.Page.FrameStoppedLoadingEvent) => {
                    if (event.frameId === frameId) {
                        const { root } = await this.socket.send('DOM.getDocument', {
                            depth: -1
                        });

                        if (root) {
                            this.document = new Document(root);
                            this.storage = new Storage(url);

                            this.socket.on('DOMStorage.domStorageItemAdded', this.storage.setItem.bind(this.storage));
                            this.socket.on('DOMStorage.domStorageItemUpdated', this.storage.updateItem.bind(this.storage));
                            this.socket.on('DOM.setChildNodes', this.document.update.bind(this.document));

                            resolve();
                        }
                        reject();

                        this.socket.off('Page.frameStoppedLoading', onFrameStoppedLoading);
                    }
                };

                this.socket.on('Page.frameStoppedLoading', onFrameStoppedLoading);
            });
        } catch(e) {
            log.error('Failed to navigate to url.');
            log.debug(e);
        }
    }

    async saveScreenshot({ path, format, quality }: { path: string, format: string, quality: number }) {
        if (typeof path !== 'string')
            throw new Error('`path` must be a string');

        try {
            const { data: base64 } = await this.socket.send('Page.captureScreenshot', {
                format,
                quality
            });

            if (base64) {
                const buffer = Buffer.from(base64, 'base64');
                await writeFile(path, buffer);
            }
        } catch(e) {
            log.error('Failed to save screenshot.');
            log.debug(e);
        }
    }

    async getElementBySelector(selector: string) {
        if (this.document === null)
            throw new Error('document does not exist.');

        if (typeof selector !== 'string')
            throw new Error('argument must be a string');

        try {
            const { nodeId } = await this.socket.send('DOM.querySelector', {
                nodeId: this.document.nodeId,
                selector
            });

            if (nodeId)
                return this.document.get(nodeId);
            return null
        } catch(e) {
            log.error('Failed to query dom.');
            log.debug(e);
        }
    }

    async setStorageItem(key: string, value: any) {
        if (this.storage === null)
            throw new Error('storage does not exist.');

        try {
            await this.socket.send('DOMStorage.setDOMStorageItem', {
                storageId: this.storage.storageId,
                key,
                value
            });
        } catch(e) {
            log.error('Failed to set storage item.');
            log.debug(e);
        }
    }

    async clearStorage() {
        if (this.storage === null)
            throw new Error('storage does not exist.');

        try {
            await this.socket.send('DOMStorage.clear', {
                storageId: this.storage.storageId
            });
        } catch(e) {
            log.error('Failed to clear storage');
            log.debug(e);
        }
    }

    waitForSelector(selector: string, retries = 0) {     
        if (typeof selector !== 'string')
            throw new Error('selector must be a string');
        
        if (retries >= this.maxRetries)
            return Promise.reject(`waitForSelector failed after ${this.maxRetries} retries.`);

        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    const result = await this.getElementBySelector(selector);
                    result ? resolve(result) : resolve(this.waitForSelector(selector, retries + 1));
                } catch(e) {
                    log.debug(e);
                    reject(e);
                }
            }, 1000);
        });   
    }
}

export default Controller;