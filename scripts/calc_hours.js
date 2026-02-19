
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

    // Initial 15 mins for the first commit of the FIRST session
    // Logic: session gap > 2 hours (7200 seconds)

    // We need to treat the list of timestamps as a sequence of work.
    // Add 15 mins (900 seconds) for the start of any new session.

    let currentSessionSeconds = 0;
    let sessionCount = 0;

    for (let i = 0; i < timestamps.length; i++) {
        const time = timestamps[i];

        if (i === 0) {
            sessionCount++;
            currentSessionSeconds = 900; // 15 min buffer for start
        } else {
            const gap = time - lastTime;
            if (gap > 7200) { // 2 hours
                totalSeconds += currentSessionSeconds;
                // New session
                sessionCount++;
                currentSessionSeconds = 900; // 15 min buffer
            } else {
                currentSessionSeconds += gap;
            }
        }
        lastTime = time;
    }
    totalSeconds += currentSessionSeconds;

    return (totalSeconds / 3600).toFixed(1);
}

const tags = execSync('git tag --sort=creatordate', { encoding: 'utf-8' })
    .trim().split('\n').filter(Boolean);

// Add initial commit to v0.1.0
// We need to handle the "gap" that was filled (v0.16 -> v0.19 gap analysis).
// The user manually added v0.17.0 and v0.18.0 tags in previous step.

let previousTag = null;
const versions = [];

// Manually ensure correct order if creatordate is weird for retroactive tags, 
// but git tag --sort=creatordate usually works well if they were created in order or retroactively with correct dates?
// Actually v0.1.0 to v0.13.0 were retroactively tagged on Feb 11.
// So creatordate might cluster them all on Feb 11.
// We should rely on "version sort" for the early ones, or just mapped known sequence.
// Let's use version sort for the list.

const sortedTags = execSync('git tag --sort=v:refname', { encoding: 'utf-8' })
    .trim().split('\n').filter(Boolean);

// Filter to only the ones we care about or all of them
// The document has:
// v0.21.1, v0.20.0, v0.19.5, v0.19.0
// v0.18.0, v0.17.0, v0.16.0, v0.15.0, v0.14.0
// v0.13.0 ... v0.1.0

const targetVersions = [
    'v0.1.0', 'v0.2.0', 'v0.3.0', 'v0.4.0', 'v0.5.0', 'v0.6.0', 'v0.7.0', 'v0.8.0', 'v0.9.0',
    'v0.10.0', 'v0.11.0', 'v0.12.0', 'v0.13.0', 'v0.14.0', 'v0.15.0', 'v0.16.0',
    'v0.17.0', 'v0.18.0', 'v0.19.0', 'v0.19.5', 'v0.20.0', 'v0.21.1'
];

// We need to find the "previous" tag for each target version to define the range.
// For the retroactive ones (v0.1 to v0.13), they might cover overlapping commits if we are not careful,
// OR they partition the history perfectly.
// Assuming they partition history: v0.1.0 is start->v0.1.0. v0.2.0 is v0.1.0->v0.2.0.

for (const version of targetVersions) {
    const hours = calculateHours(getCommits(previousTag, version));
    console.log(`${version}: ${hours}h`);
    previousTag = version;
}
