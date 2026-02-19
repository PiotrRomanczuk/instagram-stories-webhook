
const { execSync } = require('child_process');

function getCommits(from, to) {
    const range = from ? `${from}..${to}` : to;
    try {
        const output = execSync(`git log ${range} --format="%at"`, { encoding: 'utf-8' });
        return output.trim().split('\n').filter(Boolean).map(t => parseInt(t, 10)).sort((a, b) => a - b);
    } catch (e) {
        return [];
    }
}

function calculateHours(timestamps) {
    if (timestamps.length === 0) return 0;

    let totalSeconds = 0;
    let sessionStart = timestamps[0];
    let lastTime = timestamps[0];
    let currentSessionSeconds = 900; // 15 min buffer for first session

    for (let i = 1; i < timestamps.length; i++) {
        const time = timestamps[i];
        const gap = time - lastTime;

        if (gap > 7200) { // 2 hours
            totalSeconds += currentSessionSeconds;
            currentSessionSeconds = 900; // New session buffer
        } else {
            currentSessionSeconds += gap;
        }
        lastTime = time;
    }
    totalSeconds += currentSessionSeconds;

    return (totalSeconds / 3600).toFixed(1);
}

const targetVersions = process.argv.slice(2);
let previousTag = null;

if (targetVersions.length === 0) {
    // Default list if no args
    previousTag = null;
}

// targetVersions passed as args: "v0.1.0" "v0.2.0" ...

for (const version of targetVersions) {
    const hours = calculateHours(getCommits(previousTag, version));
    console.log(`${version}: ${hours}h`);
    previousTag = version;
}
