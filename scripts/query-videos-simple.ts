import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oyvhajunvxxmhmbmumei.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
	console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
	console.log('🔍 Querying video content items...\n');

	const { data, error } = await supabase
		.from('content_items')
		.select('id, title, media_type, media_url, thumbnail_url, submission_status, publishing_status')
		.eq('media_type', 'VIDEO')
		.limit(10);

	if (error) {
		console.error('❌ Error:', error);
		return;
	}

	if (!data || data.length === 0) {
		console.log('⚠️  No video content items found in database');
		return;
	}

	console.log(`📹 Found ${data.length} video items:\n`);

	data.forEach((item, index) => {
		console.log(`${index + 1}. ID: ${item.id}`);
		console.log(`   Title: ${item.title || 'N/A'}`);
		console.log(`   Media Type: ${item.media_type}`);
		console.log(`   Media URL: ${item.media_url?.substring(0, 80)}...`);
		console.log(`   Thumbnail URL: ${item.thumbnail_url ? item.thumbnail_url.substring(0, 80) + '...' : '❌ MISSING'}`);
		console.log(`   Status: ${item.submission_status || 'N/A'} / ${item.publishing_status}`);
		console.log('');
	});
}

main();
