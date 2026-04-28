/**
 * One-time Google Drive OAuth setup.
 * Run once to obtain GOOGLE_REFRESH_TOKEN:
 *
 *   npx tsx scripts/setup-drive.ts
 *
 * Prerequisites:
 *   - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
 *   - Google Drive API enabled in your Google Cloud project
 *   - http://localhost:3000 or urn:ietf:wg:oauth:2.0:oob as an authorized redirect URI
 */
import 'dotenv/config';
import { google } from 'googleapis';
import * as readline from 'readline';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob',
);

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive'],
    prompt: 'consent',
});

console.log('\n=== Google Drive OAuth Setup ===\n');
console.log('1. Open this URL in your browser:\n');
console.log('   ' + authUrl);
console.log('\n2. Authorize the app and copy the code shown.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('3. Paste the code here: ', async (code) => {
    rl.close();
    try {
        const { tokens } = await oauth2Client.getToken(code.trim());

        if (!tokens.refresh_token) {
            console.error('\nNo refresh token returned. Make sure prompt=consent is set and you authorized a fresh account.');
            process.exit(1);
        }

        console.log('\n=== Success! Add these to your .env ===\n');
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('\nThen create the root folder in Google Drive and set:');
        console.log('GOOGLE_DRIVE_ROOT_FOLDER_ID=<folder-id-from-drive-url>');
    } catch (err) {
        console.error('\nFailed to exchange code:', err);
        process.exit(1);
    }
});
