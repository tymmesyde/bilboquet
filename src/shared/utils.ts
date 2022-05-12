import path from 'path';
import { createWriteStream } from 'fs';
import { readdir, rename, rmdir, rm } from 'fs/promises';
import unzip from 'extract-zip';
import axios from 'axios';

const getRootFolder = () => {
    const root = require?.main?.filename;
    return path.dirname(root || '');
};

const downloadFile = (url: string, out: string) => {
    return new Promise(async (resolve) => {
        const writer = createWriteStream(out);
        writer.on('finish', resolve);

        const { data } = await axios({
            method: 'GET',
            url,
            responseType: 'stream'
        });
        data.pipe(writer);
    });
};

const extractZip = async (src: string, out: string) => {
    await unzip(src, {
        dir: out
    });
    await rm(src);
};

const moveDirectoryFiles = async (src: string, out: string) => {
    const filenames = await readdir(src);
    await Promise.all(filenames.map((filename) => {
        return rename(path.join(src, filename), path.join(out, filename));
    }));
    await rmdir(src);
};

export {
    getRootFolder,
    downloadFile,
    extractZip,
    moveDirectoryFiles
};