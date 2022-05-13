type Config = {
    revision: number,
    port: number,
    maxRetries?: number;
    debug?: boolean,
    silent?: boolean
};

type Tab = {
    id: string;
    type: string;
    url: string;
}

export {
    Config,
    Tab
};