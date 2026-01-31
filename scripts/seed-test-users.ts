/**
 * Seed test users for E2E testing
 *
 * Usage: npx tsx scripts/seed-test-users.ts
 */

async function seedTestUsers() {
	const dotenv = await import('dotenv');
	dotenv.config({ path: '.env.local' });

	const { supabaseAdmin } = await import('../lib/config/supabase-admin');

	console.log('Seeding test users for E2E testing...\n');

	const testUsers = [
		{ email: 'admin@test.com', role: 'admin' },
		{ email: 'user@test.com', role: 'user' },
		{ email: 'user2@test.com', role: 'user' },
	];

	for (const user of testUsers) {
		const { data, error } = await supabaseAdmin
			.from('email_whitelist')
			.upsert(
				{ email: user.email, role: user.role },
				{ onConflict: 'email' }
			)
			.select()
			.single();

		if (error) {
			console.error(`Failed to add ${user.email}:`, error.message);
		} else {
			console.log(`Added: ${user.email} (${user.role})`);
		}
	}

	console.log('\nTest users seeded successfully!');
}

seedTestUsers().catch(console.error);
