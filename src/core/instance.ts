import os from 'os';
import { existsSync } from 'fs';
import { mkdir, rm } from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import log from 'loglevel';
import { downloadFile, extractZip, getRootFolder, moveDirectoryFiles } from '../shared/utils';
import { PLATFORMS_SNAPSHOTS, SNAPSHOTS_BASEURL, SNAPSHOT_USER_DATA } from '../shared/constants';
import { Config } from '../shared/types';

class Instance {
    process: any;
    spawned: boolean;
    revision: number;
    port: number;
    platform: string;
    snapshotLocation: string;

    constructor({ revision, port, debug, silent }: Config) {
        this.process = null;
        this.spawned = false;
        this.revision = revision;
        this.port = port;
        this.platform = os.platform();
        this.snapshotLocation = path.join(getRootFolder(), 'snapshots', `${this.platform}_${this.revision}`);

        log.setLevel(debug ? 'debug' : silent ? 'silent' : 'info');
    }

    private async install() {
        try {
            log.info(`Installing snapshot r${this.revision} for ${this.platform}...`);

            const { arch, filename, extension } = PLATFORMS_SNAPSHOTS[this.platform];
            await mkdir(this.snapshotLocation, {
                recursive: true
            });

            const zipOut = path.join(this.snapshotLocation, `${filename}${extension}`);
            const downloadUrl = `${SNAPSHOTS_BASEURL}/${arch}%2F${this.revision}%2F${filename}${extension}?alt=media`;
            await downloadFile(downloadUrl, zipOut);
            await extractZip(zipOut, this.snapshotLocation);
            await moveDirectoryFiles(path.join(this.snapshotLocation, filename), this.snapshotLocation);

            log.info('Done installing.');
        } catch (e) {
            log.error('Failed to install.');
            log.debug(e);
        }
    }

    private async clearUserData() {
        try {
            const userDataLocation = path.resolve(this.snapshotLocation, SNAPSHOT_USER_DATA);
            if (existsSync(userDataLocation))
                await rm(userDataLocation, {
                    recursive: true
                });
        } catch(e) {
            log.error('Failed to clear use data.');
            log.debug(e);
        }
    }

    async launch() {
        if (!existsSync(this.snapshotLocation))
            await this.install();

        await this.clearUserData();

        const args = ['--no-sandbox', `--remote-debugging-port=${this.port}`, `--user-data-dir=${SNAPSHOT_USER_DATA}`];
        this.process = spawn('./chrome', args, {
            cwd: this.snapshotLocation,
        });

        this.process.on('spawn', () => {
            this.spawned = true;
            log.info(`Chromium launched.`);
        });

        this.process.on('error', (err: string) => {
            log.error('Failed to launch Chromium.');
            log.debug(err);
        });

        this.process.on('close', (code: number) => {
            log.debug('close', code);
            this.spawned = false;

            if (code === 20)
                throw new Error('An instance of chromium is already running.')
        });

        return new Promise<void>((resolve) => {
            this.process.stdout.on('data', (data: Buffer) => {
                log.debug('stdout:', data.toString());
                resolve();
            });

            this.process.stderr.on('data', (data: Buffer) => {
                log.debug('stderr: ', data.toString());
                resolve();
            });
        });
    }

    async exit() {
        process.kill(this.process.pid, 'SIGTERM');
        this.process.stdout.removeAllListeners();
        this.process.stderr.removeAllListeners();
        this.process.removeAllListeners();
        this.process.kill('SIGTERM');
        this.process = null;

        await this.clearUserData();

        log.info(`Chromium exited.`);
    }
}

export default Instance;