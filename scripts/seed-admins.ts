
async function seedAdmins() {
    // Dynamic imports to ensure env vars are loaded first
    // We import dotenv effectively via dynamic import to be safe, though config order matters most
    const dotenv = await import('dotenv');
    dotenv.config({ path: '.env.local' });

    const { addAllowedUser } = await import('../lib/memes-db');

    console.log('🌱 Seeding admin users...');

    const adminEmailsEnv = process.env.ADMIN_EMAIL;
    if (!adminEmailsEnv) {
        console.warn('⚠️ No ADMIN_EMAIL found in environment variables.');
        return;
    }

    const emails = adminEmailsEnv.split(',').map(e => e.trim().toLowerCase());

    for (const email of emails) {
        if (!email) continue;

        console.log(`Processing ${email}...`);

        const result = await addAllowedUser({
            email,
            role: 'admin',
            display_name: 'Admin',
            added_by: 'system_seed'
        });

        if (result) {
            console.log(`✅ Added ${email} as admin.`);
        } else {
            console.log(`ℹ️ ${email} might already exist or failed to add.`);
        }
    }

    console.log('✨ Seeding complete.');
}

seedAdmins().catch(console.error);
