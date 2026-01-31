/**
 * Seed script to create test meme submissions for admin review
 * Uses the unified content_items table
 *
 * Usage: npx tsx scripts/seed-pending-memes.ts
 */

async function seedPendingMemes() {
	// Load env first
	const dotenv = await import('dotenv');
	dotenv.config({ path: '.env.local' });

	const { supabaseAdmin } = await import('../lib/config/supabase-admin');

	console.log('🌱 Seeding pending submissions for admin review...\n');

	const TEST_USER_EMAIL = 'granagitarzewarszawa@gmail.com';
	const TEST_USER_ID = TEST_USER_EMAIL;

	// Sample meme data with placeholder images
	const testMemes = [
		{
			title: 'Monday Morning Mood',
			caption: 'When you realize it\'s only Monday #mondaymood #relatable',
			media_url: 'https://picsum.photos/seed/meme1/1080/1920',
		},
		{
			title: 'Coffee Addiction',
			caption: 'Me before my first coffee vs after #coffeelover #morningvibes',
			media_url: 'https://picsum.photos/seed/meme2/1080/1920',
		},
		{
			title: 'Weekend Plans',
			caption: 'My weekend plans vs reality #weekendmood #lazy',
			media_url: 'https://picsum.photos/seed/meme3/1080/1920',
		},
		{
			title: 'Programmer Life',
			caption: 'When the code works on first try #programming #developer',
			media_url: 'https://picsum.photos/seed/meme4/1080/1920',
		},
		{
			title: 'Gym Motivation',
			caption: 'New year, new me... for about 2 weeks #gym #fitness',
			media_url: 'https://picsum.photos/seed/meme5/1080/1920',
		},
		{
			title: 'Pizza Time',
			caption: 'Diet starts tomorrow... again #pizza #foodie',
			media_url: 'https://picsum.photos/seed/meme6/1080/1920',
		},
		{
			title: 'Netflix Binge',
			caption: 'Just one more episode... 5 hours later #netflix #bingewatching',
			media_url: 'https://picsum.photos/seed/meme7/1080/1920',
		},
		{
			title: 'Adulting is Hard',
			caption: 'When you have to adult but you\'re not ready #adulting #struggle',
			media_url: 'https://picsum.photos/seed/meme8/1080/1920',
		},
		{
			title: 'Friday Feeling',
			caption: 'That Friday feeling hits different #friday #weekend',
			media_url: 'https://picsum.photos/seed/meme9/1080/1920',
		},
		{
			title: 'Sleep Schedule',
			caption: 'My sleep schedule: non-existent #insomnia #nightowl',
			media_url: 'https://picsum.photos/seed/meme10/1080/1920',
		},
		{
			title: 'Online Shopping',
			caption: 'Add to cart, Forget, Repeat #shopping #onlineshopping',
			media_url: 'https://picsum.photos/seed/meme11/1080/1920',
		},
		{
			title: 'Pet Parent Life',
			caption: 'My pet is my whole personality now #petlife #dogmom',
			media_url: 'https://picsum.photos/seed/meme12/1080/1920',
		},
		{
			title: 'Work From Home',
			caption: 'WFH outfit: business on top, pajamas on bottom #wfh #remotework',
			media_url: 'https://picsum.photos/seed/meme13/1080/1920',
		},
		{
			title: 'Social Battery',
			caption: 'Social battery at 2%... time to recharge #introvert #socialanxiety',
			media_url: 'https://picsum.photos/seed/meme14/1080/1920',
		},
		{
			title: 'Procrastination King',
			caption: 'I\'ll do it later... said every time #procrastination #later',
			media_url: 'https://picsum.photos/seed/meme15/1080/1920',
		},
	];

	const now = new Date().toISOString();

	// Format for content_items table (unified content hub)
	const contentItems = testMemes.map((meme) => ({
		user_id: TEST_USER_ID,
		user_email: TEST_USER_EMAIL,
		media_url: meme.media_url,
		media_type: 'IMAGE',
		title: meme.title,
		caption: meme.caption,
		source: 'submission',
		submission_status: 'pending',
		publishing_status: 'draft',
		version: 1,
		retry_count: 0,
		created_at: now,
		updated_at: now,
	}));

	console.log(`📝 Inserting ${contentItems.length} pending submissions into content_items...\n`);

	const { data, error } = await supabaseAdmin
		.from('content_items')
		.insert(contentItems)
		.select('id, title');

	if (error) {
		console.error('❌ Error inserting content items:', error.message);
		process.exit(1);
	}

	console.log('✅ Successfully created pending submissions:\n');
	data?.forEach((item, i) => {
		console.log(`   ${i + 1}. ${item.title} (${item.id})`);
	});

	console.log('\n✨ Seeding complete!');
	console.log(`   Total created: ${data?.length || 0}`);
	console.log(`   User: ${TEST_USER_EMAIL}`);
	console.log(`   Status: pending (awaiting admin review in Review Queue)`);
}

seedPendingMemes().catch(console.error);
