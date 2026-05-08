import { getRecentStories } from '@/lib/instagram/media';
import { getMediaInsights } from '@/lib/instagram/insights';

async function main() {
	const userId = '02075c7e-537c-4d81-a0fd-09a557aef283';
	const { stories } = await getRecentStories(userId, 3);
	for (const s of stories) {
		console.log('\n---', s.id, s.media_type, s.timestamp);
		try {
			const ins = await getMediaInsights(s.id, userId, 'STORY');
			console.log('  metrics:', ins.map((m) => `${m.name}=${m.values[0]?.value}`).join(', '));
		} catch (e) {
			console.log('  ERROR:', e instanceof Error ? e.message : e);
		}
	}
}
main().catch((e) => { console.error(e); process.exit(1); });
