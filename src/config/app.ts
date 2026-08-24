// ponytail: app not published yet, so these URLs 404 until the listing is live.
// Update APP_ID here if the applicationId changes (android/app/build.gradle).
export const APP_ID = 'com.abhishek.documentScanner';
export const APP_NAME = 'Document Suite';

export const PLAY_STORE_WEB = `https://play.google.com/store/apps/details?id=${APP_ID}`;
export const PLAY_STORE_MARKET = `market://details?id=${APP_ID}`;

export const SHARE_APP_MESSAGE = `Scan, edit and share documents with ${APP_NAME}.\nDownload: ${PLAY_STORE_WEB}`;

// Appended to every document/image share so recipients get a link to the app.
export const DOC_SHARE_FOOTER = `\n\nShared with ${APP_NAME} — scan, edit & convert on your phone.\nGet the app: ${PLAY_STORE_WEB}`;
