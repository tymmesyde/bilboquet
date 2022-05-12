const SNAPSHOTS_BASEURL: string = 'https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o';
const PLATFORMS_SNAPSHOTS: any = {
    linux: {
        arch: 'Linux_x64',
        filename: 'chrome-linux',
        extension: '.zip'
    }
};
const SNAPSHOT_USER_DATA: string = 'user_data';

export {
    SNAPSHOTS_BASEURL,
    PLATFORMS_SNAPSHOTS,
    SNAPSHOT_USER_DATA
};