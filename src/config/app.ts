// ponytail: app not published yet, so these URLs 404 until the listing is live.
// Update APP_ID here if the applicationId changes (android/app/build.gradle).
export const APP_ID = 'com.appinventiv.documentscanner';
export const APP_NAME = 'Document Scanner';

export const PLAY_STORE_WEB = `https://play.google.com/store/apps/details?id=${APP_ID}`;
export const PLAY_STORE_MARKET = `market://details?id=${APP_ID}`;

export const SHARE_APP_MESSAGE = `Scan documents to crisp PDFs with ${APP_NAME}.\nDownload: ${PLAY_STORE_WEB}`;

// Appended to every document share so recipients get a link to the app.
export const DOC_SHARE_FOOTER = `\n\nShared with ${APP_NAME}. Get the app: ${PLAY_STORE_WEB}`;
