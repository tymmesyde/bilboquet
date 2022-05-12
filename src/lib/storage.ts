import Protocol from 'devtools-protocol';

class Storage {
    public storageId: Protocol.DOMStorage.StorageId;
    public items: Record<string, any>;

    constructor(url: string) {
        const { origin: securityOrigin } = new URL(url);
        this.storageId = {
            securityOrigin,
            isLocalStorage: true
        };
        this.items = [];
    }

    setItem({ key, value }: { key: string, value: any }) {
        this.items[key] = value;
    }

    updateItem({ key, newValue }: { key: string, newValue: any }) {
        this.items[key] = newValue;
    }
}

export default Storage;