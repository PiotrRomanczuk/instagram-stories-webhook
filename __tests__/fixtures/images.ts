import sharp from 'sharp';

/**
 * Generate test image buffers for media processing tests
 */

// 1080x1920 (9:16 - perfect for stories)
export const create9x16Image = async (): Promise<Buffer> => {
    return await sharp({
        create: {
            width: 1080,
            height: 1920,
            channels: 3,
            background: { r: 100, g: 150, b: 200 },
        },
    })
        .jpeg()
        .toBuffer();
};

// 1080x1080 (1:1 - square, needs padding)
export const createSquareImage = async (): Promise<Buffer> => {
    return await sharp({
        create: {
            width: 1080,
            height: 1080,
            channels: 3,
            background: { r: 200, g: 100, b: 150 },
        },
    })
        .jpeg()
        .toBuffer();
};

// 1920x1080 (16:9 - landscape, needs padding)
export const createLandscapeImage = async (): Promise<Buffer> => {
    return await sharp({
        create: {
            width: 1920,
            height: 1080,
            channels: 3,
            background: { r: 150, g: 200, b: 100 },
        },
    })
        .jpeg()
        .toBuffer();
};

// Small image (needs upscaling)
export const createSmallImage = async (): Promise<Buffer> => {
    return await sharp({
        create: {
            width: 500,
            height: 888,
            channels: 3,
            background: { r: 100, g: 100, b: 200 },
        },
    })
        .jpeg()
        .toBuffer();
};

// Invalid image (too small)
export const createTooSmallImage = async (): Promise<Buffer> => {
    return await sharp({
        create: {
            width: 200,
            height: 200,
            channels: 3,
            background: { r: 255, g: 0, b: 0 },
        },
    })
        .jpeg()
        .toBuffer();
};
