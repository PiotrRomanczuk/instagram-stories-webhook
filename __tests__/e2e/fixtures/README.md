# Test Fixtures

This directory contains test fixtures for E2E tests.

## Directory Structure

```
fixtures/
├── auth/                    # Authentication state files
│   ├── admin-auth.json     # Admin user auth state
│   └── user-auth.json      # Regular user auth state
├── test-images/            # Test image files
│   ├── valid-square.jpg    # Valid 1:1 aspect ratio (1080x1080)
│   ├── valid-story.jpg     # Valid 9:16 aspect ratio (1080x1920)
│   ├── invalid-aspect.jpg  # Invalid aspect ratio (1920x1080)
│   └── oversized.jpg       # File > 8MB for size validation
└── test-videos/            # Test video files
    ├── valid-video.mp4     # Valid MP4 video
    └── invalid-format.avi  # Invalid format for testing
```

## Setup Instructions

### 1. Authentication States

Authentication state files will be generated during test setup. If you need to manually create them:

```json
// admin-auth.json
{
  "cookies": [...],
  "localStorage": {
    "session": "..."
  }
}
```

### 2. Test Images

You need to create or download the following test images:

#### valid-square.jpg
- **Dimensions**: 1080x1080 pixels
- **Aspect Ratio**: 1:1 (square)
- **Format**: JPEG
- **Size**: < 8MB
- **Purpose**: Valid square Instagram post

#### valid-story.jpg
- **Dimensions**: 1080x1920 pixels
- **Aspect Ratio**: 9:16 (vertical)
- **Format**: JPEG
- **Size**: < 8MB
- **Purpose**: Valid Instagram story format

#### invalid-aspect.jpg
- **Dimensions**: 1920x1080 pixels
- **Aspect Ratio**: 16:9 (landscape)
- **Format**: JPEG
- **Size**: < 8MB
- **Purpose**: Test aspect ratio validation

#### oversized.jpg
- **Dimensions**: Any
- **Format**: JPEG
- **Size**: > 8MB
- **Purpose**: Test file size validation

### 3. Test Videos

#### valid-video.mp4
- **Format**: MP4
- **Duration**: 5-10 seconds
- **Size**: < 100MB
- **Purpose**: Valid video upload

#### invalid-format.avi
- **Format**: AVI
- **Purpose**: Test format validation

## Generating Test Media

### Using ImageMagick

```bash
# Install ImageMagick
sudo apt-get install imagemagick

# Generate valid square image (1080x1080)
convert -size 1080x1080 xc:blue -fill white -pointsize 72 -gravity center \
  -annotate +0+0 "Test\nSquare\n1:1" \
  test-images/valid-square.jpg

# Generate valid story image (1080x1920)
convert -size 1080x1920 xc:green -fill white -pointsize 72 -gravity center \
  -annotate +0+0 "Test\nStory\n9:16" \
  test-images/valid-story.jpg

# Generate invalid aspect ratio (1920x1080)
convert -size 1920x1080 xc:red -fill white -pointsize 72 -gravity center \
  -annotate +0+0 "Invalid\n16:9" \
  test-images/invalid-aspect.jpg

# Generate oversized file (> 8MB)
convert -size 4000x4000 xc:yellow -fill black -pointsize 72 -gravity center \
  -annotate +0+0 "Oversized\n>8MB" \
  -quality 100 test-images/oversized.jpg
```

### Using FFmpeg for Videos

```bash
# Install FFmpeg
sudo apt-get install ffmpeg

# Generate valid video (5 seconds, 1080x1920)
ffmpeg -f lavfi -i color=c=blue:s=1080x1920:d=5 \
  -vf "drawtext=text='Test Video':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" \
  -pix_fmt yuv420p test-videos/valid-video.mp4

# Convert to AVI for invalid format test
ffmpeg -i test-videos/valid-video.mp4 test-videos/invalid-format.avi
```

## Quick Setup Script

Run the setup script to generate all test media:

```bash
cd __tests__/e2e/fixtures
chmod +x setup-media.sh
./setup-media.sh
```

## Notes

- Test images should be committed to the repository
- Large files (> 1MB) should be added to `.gitattributes` with LFS
- Authentication state files should NOT be committed (they contain session data)
- Add `auth/*.json` to `.gitignore`

## Cleanup

To remove all generated test data:

```bash
rm -rf auth/*.json
rm -rf test-images/*
rm -rf test-videos/*
```
