export function isV0DemoMode(): boolean {
	return (
		process.env.NEXT_PUBLIC_DEMO_MODE === '1' ||
		process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
	);
}
