/* eslint-disable */
const fs = require('fs');
const path = require('path');
const https = require('https');

const MEME_DIR = path.join(process.cwd(), 'memes');

// Ensure directory exists
if (!fs.existsSync(MEME_DIR)) {
    fs.mkdirSync(MEME_DIR);
}

async function downloadMemes() {
    console.log('Fetching meme list...');
    try {
        const response = await fetch('https://api.imgflip.com/get_memes');
        const data = await response.json();

        if (!data.success) {
            console.error('Failed to fetch memes:', data.error_message);
            return;
        }

        const memes = data.data.memes.slice(0, 100);
        console.log(`Found ${memes.length} memes. Starting download...`);

        let completed = 0;

        for (let i = 0; i < memes.length; i++) {
            const meme = memes[i];
            const fileName = `${i + 1}_${meme.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
            const filePath = path.join(MEME_DIR, fileName);

            const file = fs.createWriteStream(filePath);

            await new Promise((resolve, reject) => {
                https.get(meme.url, (response) => {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        completed++;
                        // console.log(`Downloaded: ${fileName}`);
                        resolve(null);
                    });
                }).on('error', (err) => {
                    fs.unlink(filePath, () => { }); // Delete the file async. (But we don't check for this error in strict sense here)
                    console.error(`Error downloading ${meme.name}:`, err.message);
                    reject(err);
                });
            });

            if (completed % 10 === 0) {
                console.log(`Progress: ${completed}/${memes.length}`);
            }
        }

        console.log('All downloads completed!');

    } catch (error) {
        console.error('An error occurred:', error);
    }
}

downloadMemes();
