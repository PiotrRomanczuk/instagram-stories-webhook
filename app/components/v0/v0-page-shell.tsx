import { PageHeader } from '@/app/components/layout/page-header';
import { Badge } from '@/app/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface Props {
	title: string;
	description?: string;
	children: React.ReactNode;
	hideBackLink?: boolean;
}

export function V0PageShell({ title, description, children, hideBackLink }: Props) {
	return (
		<main className="min-h-screen bg-gray-50">
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
				<PageHeader
					title={title}
					description={description}
					badge={
						<Badge variant="secondary" className="gap-1">
							<Sparkles className="h-3 w-3" />
							v0 prototype
						</Badge>
					}
					backLink={hideBackLink ? undefined : '/v0'}
					backLinkText="Walkthrough hub"
				/>
				{children}
			</div>
		</main>
	);
}
