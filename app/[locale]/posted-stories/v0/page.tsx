import { V0PageShell } from '@/app/components/v0/v0-page-shell';
import { V0PostedWall } from '@/app/components/v0/posted-wall';

// TODO(v1): query published submissions + composed_videos joined to users (for display_name +
// display_name_override). Strip payment fields from the response before serializing.
export default function V0PostedWallPage() {
	return (
		<V0PageShell
			title="Published wall"
			description="What we've shipped, with contributor attribution. Payment amounts are not shown publicly."
		>
			<V0PostedWall />
		</V0PageShell>
	);
}
