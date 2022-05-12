type Config = {
    revision: number,
    port: number,
    maxRetries?: number;
    debug?: boolean,
    silent?: boolean
};

type Tab = {
    type: string;
    id: string;
}

export {
    Config,
    Tab
};