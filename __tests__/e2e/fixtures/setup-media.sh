#!/bin/bash

# Setup Test Media Files for E2E Tests
# This script generates test images and videos for Playwright E2E testing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGES_DIR="$SCRIPT_DIR/test-images"
VIDEOS_DIR="$SCRIPT_DIR/test-videos"

echo "Setting up test media files..."

# Create directories
mkdir -p "$IMAGES_DIR"
mkdir -p "$VIDEOS_DIR"

# Check for ImageMagick
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Please install it:"
    echo "   Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "   macOS: brew install imagemagick"
    exit 1
fi

echo "✅ ImageMagick found"

# Check for FFmpeg (optional)
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg found"
    HAS_FFMPEG=true
else
    echo "⚠️  FFmpeg not found. Video files will be skipped."
    echo "   Ubuntu/Debian: sudo apt-get install ffmpeg"
    echo "   macOS: brew install ffmpeg"
    HAS_FFMPEG=false
fi

echo ""
echo "Generating test images..."

# Generate valid square image (1080x1080, 1:1)
echo "  → Creating valid-square.jpg (1080x1080, 1:1)"
convert -size 1080x1080 \
  gradient:blue-lightblue \
  -fill white -pointsize 72 -gravity center \
  -annotate +0+0 "Test Meme\nSquare\n1:1" \
  -quality 85 \
  "$IMAGES_DIR/valid-square.jpg"

# Generate valid story image (1080x1920, 9:16)
echo "  → Creating valid-story.jpg (1080x1920, 9:16)"
convert -size 1080x1920 \
  gradient:green-lightgreen \
  -fill white -pointsize 72 -gravity center \
  -annotate +0+0 "Test Story\nVertical\n9:16" \
  -quality 85 \
  "$IMAGES_DIR/valid-story.jpg"

# Generate invalid aspect ratio (1920x1080, 16:9)
echo "  → Creating invalid-aspect.jpg (1920x1080, 16:9)"
convert -size 1920x1080 \
  gradient:red-lightcoral \
  -fill white -pointsize 72 -gravity center \
  -annotate +0+0 "Invalid Aspect\nLandscape\n16:9" \
  -quality 85 \
  "$IMAGES_DIR/invalid-aspect.jpg"

# Generate oversized file (> 8MB)
echo "  → Creating oversized.jpg (> 8MB)"
convert -size 4000x4000 \
  gradient:yellow-gold \
  -fill black -pointsize 120 -gravity center \
  -annotate +0+0 "Oversized\nFile\n>8MB" \
  -quality 100 \
  "$IMAGES_DIR/oversized.jpg"

# Check if oversized file is actually > 8MB
OVERSIZED_SIZE=$(stat -f%z "$IMAGES_DIR/oversized.jpg" 2>/dev/null || stat -c%s "$IMAGES_DIR/oversized.jpg" 2>/dev/null)
if [ "$OVERSIZED_SIZE" -lt 8388608 ]; then
    echo "  ⚠️  oversized.jpg is only $(($OVERSIZED_SIZE / 1024 / 1024))MB, regenerating with higher quality..."
    convert -size 5000x5000 \
      plasma: \
      -quality 100 \
      "$IMAGES_DIR/oversized.jpg"
fi

echo "✅ Test images created successfully"

# Generate test videos (if FFmpeg is available)
if [ "$HAS_FFMPEG" = true ]; then
    echo ""
    echo "Generating test videos..."

    # Generate valid video (5 seconds, 1080x1920)
    echo "  → Creating valid-video.mp4 (1080x1920, 5s)"
    ffmpeg -y -f lavfi -i color=c=blue:s=1080x1920:d=5 -f lavfi -i anullsrc \
      -vf "drawtext=text='Test Video\n5 seconds':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" \
      -pix_fmt yuv420p -shortest \
      "$VIDEOS_DIR/valid-video.mp4" > /dev/null 2>&1

    # Convert to AVI for invalid format test
    echo "  → Creating invalid-format.avi"
    ffmpeg -y -i "$VIDEOS_DIR/valid-video.mp4" \
      "$VIDEOS_DIR/invalid-format.avi" > /dev/null 2>&1

    echo "✅ Test videos created successfully"
else
    echo "⚠️  Skipping video generation (FFmpeg not installed)"
fi

echo ""
echo "📊 Summary:"
echo "  Images: $(ls -1 "$IMAGES_DIR" | wc -l) files"
if [ "$HAS_FFMPEG" = true ]; then
    echo "  Videos: $(ls -1 "$VIDEOS_DIR" | wc -l) files"
fi

echo ""
echo "✅ Test media setup complete!"
echo ""
echo "File sizes:"
ls -lh "$IMAGES_DIR"
if [ "$HAS_FFMPEG" = true ]; then
    ls -lh "$VIDEOS_DIR"
fi
