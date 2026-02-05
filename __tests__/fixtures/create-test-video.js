/**
 * Creates a test video file for E2E testing
 * Requires FFmpeg to be installed
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, 'test-video.mp4');

// Check if test video already exists
if (fs.existsSync(outputPath)) {
	console.log('✅ Test video already exists:', outputPath);
	process.exit(0);
}

console.log('Creating test video for E2E tests...');

// Create a simple 5-second test video with FFmpeg
// Generates color bars with timer overlay
const ffmpeg = spawn('ffmpeg', [
	'-f', 'lavfi',
	'-i', 'testsrc=duration=5:size=720x1280:rate=30',
	'-f', 'lavfi',
	'-i', 'sine=frequency=1000:duration=5',
	'-c:v', 'libx264',
	'-preset', 'ultrafast',
	'-c:a', 'aac',
	'-b:a', '128k',
	'-pix_fmt', 'yuv420p',
	'-y',
	outputPath
]);

ffmpeg.stdout.on('data', (data) => {
	console.log(`stdout: ${data}`);
});

ffmpeg.stderr.on('data', (data) => {
	// FFmpeg outputs to stderr
	console.log(`${data}`);
});

ffmpeg.on('close', (code) => {
	if (code === 0) {
		console.log('✅ Test video created successfully:', outputPath);
		console.log('   Duration: 5 seconds');
		console.log('   Resolution: 720x1280 (9:16)');
		console.log('   Codec: H.264/AAC');
	} else {
		console.error('❌ Failed to create test video. Exit code:', code);
		console.error('Make sure FFmpeg is installed: brew install ffmpeg (macOS) or apt install ffmpeg (Linux)');
		process.exit(1);
	}
});
