const express = require('express');
const { spawn } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const { promises: fs } = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const { createWriteStream } = require('fs');

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;
const API_SECRET = process.env.API_SECRET;

// Instagram Stories Video Constants (mirrored from main app)
const VIDEO_STORY_WIDTH = 1080;
const VIDEO_STORY_HEIGHT = 1920;
const VIDEO_MAX_DURATION_SEC = 60;
const VIDEO_FRAME_RATE = 30;
const VIDEO_BITRATE = '3500k';
const AUDIO_BITRATE = '128k';

// --- Middleware ---

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.slice(7);
  if (!API_SECRET || token !== API_SECRET) {
    return res.status(401).json({ error: 'Invalid API secret' });
  }
  next();
}

// --- FFmpeg helpers ---

function getFfmpegVersion() {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version']);
    let stdout = '';
    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.on('close', (code) => {
      if (code === 0) {
        const match = stdout.match(/ffmpeg version (\S+)/);
        resolve(match ? match[1] : 'unknown');
      } else {
        resolve('unavailable');
      }
    });
    proc.on('error', () => resolve('unavailable'));
  });
}

function getVideoMetadata(inputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      inputPath,
    ];

    const ffprobe = spawn('ffprobe', args);
    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', (data) => { stdout += data.toString(); });
    ffprobe.stderr.on('data', (data) => { stderr += data.toString(); });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`FFprobe failed: ${stderr}`));
        return;
      }
      try {
        const data = JSON.parse(stdout);
        const videoStream = data.streams?.find((s) => s.codec_type === 'video');
        const audioStream = data.streams?.find((s) => s.codec_type === 'audio');
        const format = data.format;

        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        let frameRate = 30;
        if (videoStream.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
          frameRate = den ? num / den : num;
        }

        resolve({
          width: videoStream.width,
          height: videoStream.height,
          duration: parseFloat(format.duration || 0),
          codec: videoStream.codec_name,
          frameRate: Math.round(frameRate * 100) / 100,
          bitrate: parseInt(format.bit_rate || 0),
          hasAudio: !!audioStream,
          audioCodec: audioStream?.codec_name,
          format: format.format_name,
          fileSize: parseInt(format.size || 0),
        });
      } catch (parseError) {
        reject(new Error(`Failed to parse video metadata: ${parseError}`));
      }
    });

    ffprobe.on('error', (err) => {
      reject(new Error(`FFprobe not found: ${err.message}`));
    });
  });
}

function buildFfmpegArgs(inputPath, outputPath, metadata) {
  const args = ['-y', '-i', inputPath];
  const filterParts = [];
  const processingApplied = [];

  const targetWidth = VIDEO_STORY_WIDTH;
  const targetHeight = VIDEO_STORY_HEIGHT;
  const targetRatio = targetWidth / targetHeight;
  const currentRatio = metadata.width / metadata.height;

  if (Math.abs(currentRatio - targetRatio) > 0.01) {
    if (currentRatio > targetRatio) {
      const scaledHeight = Math.round(targetWidth / currentRatio);
      const padTop = Math.round((targetHeight - scaledHeight) / 2);
      filterParts.push(`scale=${targetWidth}:${scaledHeight}`);
      filterParts.push(`pad=${targetWidth}:${targetHeight}:0:${padTop}:color=0x000000`);
      processingApplied.push('aspect-ratio-letterbox');
    } else {
      const scaledWidth = Math.round(targetHeight * currentRatio);
      const padLeft = Math.round((targetWidth - scaledWidth) / 2);
      filterParts.push(`scale=${scaledWidth}:${targetHeight}`);
      filterParts.push(`pad=${targetWidth}:${targetHeight}:${padLeft}:0:color=0x000000`);
      processingApplied.push('aspect-ratio-pillarbox');
    }
  } else if (metadata.width !== targetWidth || metadata.height !== targetHeight) {
    filterParts.push(`scale=${targetWidth}:${targetHeight}`);
    processingApplied.push('resize');
  }

  if (metadata.frameRate < 23 || metadata.frameRate > 60) {
    filterParts.push(`fps=${VIDEO_FRAME_RATE}`);
    processingApplied.push('frame-rate');
  }

  if (filterParts.length > 0) {
    args.push('-vf', filterParts.join(','));
  }

  args.push(
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-profile:v', 'high',
    '-level', '4.0',
    '-b:v', VIDEO_BITRATE,
    '-maxrate', VIDEO_BITRATE,
    '-bufsize', '7000k',
    '-pix_fmt', 'yuv420p',
  );
  processingApplied.push('h264-encoding');

  if (metadata.duration > VIDEO_MAX_DURATION_SEC) {
    args.push('-t', VIDEO_MAX_DURATION_SEC.toString());
    processingApplied.push(`duration-trim-${VIDEO_MAX_DURATION_SEC}s`);
  }

  if (metadata.hasAudio) {
    args.push(
      '-c:a', 'aac',
      '-b:a', AUDIO_BITRATE,
      '-ac', '2',
      '-ar', '44100',
    );
    processingApplied.push('aac-audio');
  } else {
    args.push(
      '-f', 'lavfi',
      '-i', 'anullsrc=r=44100:cl=stereo',
      '-shortest',
      '-c:a', 'aac',
      '-b:a', '32k',
    );
    processingApplied.push('silent-audio-added');
  }

  args.push('-movflags', '+faststart', '-f', 'mp4', outputPath);

  return { args, processingApplied };
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => { stderr += data.toString(); });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr.slice(-500)}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg not found: ${err.message}`));
    });
  });
}

async function downloadFile(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }
  const fileStream = createWriteStream(destPath);
  await pipeline(response.body, fileStream);
}

async function cleanup(...paths) {
  for (const p of paths) {
    try { await fs.unlink(p); } catch { /* ignore */ }
  }
}

// --- Routes ---

app.get('/health', async (_req, res) => {
  const ffmpegVersion = await getFfmpegVersion();
  res.json({ status: 'ok', ffmpegVersion });
});

app.post('/process-video', authMiddleware, async (req, res) => {
  const { videoUrl, supabaseConfig } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ error: 'videoUrl is required' });
  }
  if (!supabaseConfig?.url || !supabaseConfig?.key || !supabaseConfig?.bucket) {
    return res.status(400).json({ error: 'supabaseConfig with url, key, and bucket is required' });
  }

  const sessionId = crypto.randomUUID();
  const tempDir = os.tmpdir();
  const tempInput = path.join(tempDir, `input_${sessionId}.mp4`);
  const tempOutput = path.join(tempDir, `output_${sessionId}.mp4`);
  const tempThumb = path.join(tempDir, `thumb_${sessionId}.jpg`);

  try {
    console.log(`[process-video] Downloading video: ${videoUrl.slice(0, 80)}...`);
    await downloadFile(videoUrl, tempInput);

    const inputStats = await fs.stat(tempInput);
    console.log(`[process-video] Downloaded ${(inputStats.size / 1024 / 1024).toFixed(1)}MB`);

    const metadata = await getVideoMetadata(tempInput);
    console.log(`[process-video] Input: ${metadata.width}x${metadata.height}, ${Math.round(metadata.duration)}s, ${metadata.codec}`);

    // Process video
    const { args, processingApplied } = buildFfmpegArgs(tempInput, tempOutput, metadata);
    console.log(`[process-video] Running FFmpeg with ${processingApplied.length} transformations`);
    await runFfmpeg(args);

    // Extract thumbnail (frame at 2s or start)
    const thumbOffset = Math.min(2, Math.max(0, metadata.duration - 0.1));
    const thumbArgs = [
      '-y',
      '-ss', thumbOffset.toString(),
      '-i', tempInput,
      '-frames:v', '1',
      '-vf', `scale=540:960:force_original_aspect_ratio=decrease,pad=540:960:(ow-iw)/2:(oh-ih)/2:color=0x000000`,
      '-q:v', '2',
      tempThumb,
    ];
    await runFfmpeg(thumbArgs);

    // Upload to Supabase
    const supabase = createClient(supabaseConfig.url, supabaseConfig.key);
    const bucket = supabaseConfig.bucket;

    const processedBuffer = await fs.readFile(tempOutput);
    const thumbBuffer = await fs.readFile(tempThumb);

    const videoFilename = `processed-stories/story-${sessionId}.mp4`;
    const thumbFilename = `thumbnails/thumb-${sessionId}.jpg`;

    const { error: videoUploadError } = await supabase.storage
      .from(bucket)
      .upload(videoFilename, processedBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (videoUploadError) {
      throw new Error(`Video upload failed: ${videoUploadError.message}`);
    }

    const { error: thumbUploadError } = await supabase.storage
      .from(bucket)
      .upload(thumbFilename, thumbBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (thumbUploadError) {
      throw new Error(`Thumbnail upload failed: ${thumbUploadError.message}`);
    }

    const { data: videoUrlData } = supabase.storage.from(bucket).getPublicUrl(videoFilename);
    const { data: thumbUrlData } = supabase.storage.from(bucket).getPublicUrl(thumbFilename);

    const outputMetadata = await getVideoMetadata(tempOutput);

    console.log(`[process-video] Done. Applied: ${processingApplied.join(', ')}`);

    res.json({
      processedUrl: videoUrlData.publicUrl,
      thumbnailUrl: thumbUrlData.publicUrl,
      metadata: {
        width: outputMetadata.width,
        height: outputMetadata.height,
        duration: outputMetadata.duration,
        codec: outputMetadata.codec,
        frameRate: outputMetadata.frameRate,
        fileSize: outputMetadata.fileSize,
        processingApplied,
      },
    });
  } catch (error) {
    console.error(`[process-video] Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  } finally {
    await cleanup(tempInput, tempOutput, tempThumb);
  }
});

app.listen(PORT, () => {
  console.log(`Railway Video Processor running on port ${PORT}`);
});
