import sharp from 'sharp';
import axios from 'axios';
import { supabaseAdmin } from '../config/supabase-admin';
import { Logger } from '../utils/logger';

const MODULE = 'media:phash';

/**
 * Generates a perceptual hash (dHash) for an image
 * 1. Resize to 9x8 (9 columns, 8 rows)
 * 2. Convert to grayscale
 * 3. Compare adjacent pixels (left > right)
 * 4. 8x8 comparisons = 64 bits = 16 hex characters
 */
export async function generateImageHash(
	imageUrl: string,
): Promise<string | null> {
	try {
		const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
		const buffer = Buffer.from(response.data);

		// Resize to 9x8 for dHash
		const { data, info } = await sharp(buffer)
			.resize(9, 8, { fit: 'fill' })
			.grayscale()
			.raw()
			.toBuffer({ resolveWithObject: true });

		let hash = '';
		for (let row = 0; row < 8; row++) {
			let rowBinary = '';
			for (let col = 0; col < 8; col++) {
				const left = data[row * 9 + col];
				const right = data[row * 9 + col + 1];
				rowBinary += left > right ? '1' : '0';
			}
			// Convert 8 bits of row to 2 hex chars
			hash += parseInt(rowBinary, 2).toString(16).padStart(2, '0');
		}

		return hash;
	} catch (error) {
		Logger.error(MODULE, `Error generating hash for ${imageUrl}`, error);
		return null;
	}
}

/**
 * Calculates Hamming distance between two hex hashes
 */
export function calculateHammingDistance(h1: string, h2: string): number {
	if (h1.length !== h2.length) return 999;

	let distance = 0;
	for (let i = 0; i < h1.length; i++) {
		let v = parseInt(h1[i], 16) ^ parseInt(h2[i], 16);
		while (v) {
			distance++;
			v &= v - 1;
		}
	}
	return distance;
}

/**
 * Checks if a hash is a duplicate of any existing meme submission
 * Threshold 0-5 usually means "essentially identical"
 */
export async function findDuplicateSubmission(
	hash: string,
	threshold: number = 5,
): Promise<string | null> {
	try {
		// Simple exact match first (index optimized)
		const { data: exactMatches, error: exactError } = await supabaseAdmin
			.from('meme_submissions')
			.select('id, phash')
			.eq('phash', hash)
			.limit(1);

		if (exactMatches && exactMatches.length > 0) {
			return exactMatches[0].id;
		}

		// Potential future improvement: Use pgvector or similar if many memes
		// For now, let's fetch recently active meme hashes and compare
		// (Assuming we don't have millions of memes yet)
		const { data: recentMemes, error } = await supabaseAdmin
			.from('meme_submissions')
			.select('id, phash')
			.not('phash', 'is', null)
			.order('created_at', { ascending: false })
			.limit(1000);

		if (error) throw error;

		for (const meme of recentMemes || []) {
			if (
				meme.phash &&
				calculateHammingDistance(hash, meme.phash) <= threshold
			) {
				return meme.id;
			}
		}

		return null;
	} catch (error) {
		Logger.error(MODULE, 'Error checking for duplicates', error);
		return null;
	}
}
