import { EventEmitter } from 'events';
import Protocol from 'devtools-protocol';
import WebSocket from 'ws';
import log from 'loglevel';

type Reply = {
    root?: Protocol.DOM.Node;
    nodeId?: Protocol.DOM.NodeId;
    frameId?: Protocol.Page.FrameId;
    data?: string
};

class Socket extends EventEmitter {
    private socket: WebSocket | null;
    private requestId: number;
    private requestTimeout: number;
    
    constructor() {
        super();

        this.socket = null;
        this.requestId = 0;
        this.requestTimeout = 5000;
    }

    private onMessage(message: string) {
        log.debug(JSON.parse(message));
        const { id, result, error, method, params } = JSON.parse(message);

        if (id && (result || error)) {
            this.emit(id, {
                result,
                error
            });
        }
        else if (method && params) {
            this.emit(method, params);
        }
    }

    connect(url: string) {
        return new Promise<void>((resolve, reject) => {
            this.socket = new WebSocket(url);
            this.socket.on('message', this.onMessage.bind(this));
            this.socket.once('open', resolve);
            this.socket.once('error', reject);
        });
    }

    send(method: string, params?: object) {
        return new Promise<Reply>((resolve, reject) => {
            if (this.socket === null)
                throw new Error('socket does not exist.');

            this.requestId++;

            const onReply = ({ result, error }: { result: object, error: any }) => {
                if (result)
                    resolve(result);
                if (error)
                    reject(error);
            };

            this.once(this.requestId.toString(), onReply);
            this.socket.send(JSON.stringify({
                id: this.requestId,
                method,
                params
            }));

            setTimeout(() => {
                this.off(this.requestId.toString(), onReply);
                reject();
            }, this.requestTimeout);
        });
    }

    close() {
        if (this.socket === null)
            throw new Error('socket already closed.');

        this.socket.removeAllListeners();
        this.socket.close();
        this.removeAllListeners();
    }
}

export default Socket;