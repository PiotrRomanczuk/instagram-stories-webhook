import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PageHeader } from '@/app/components/layout/page-header';
import { SubmitForm } from '@/app/components/submissions/submit-form';

export default async function SubmitPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user) {
		redirect('/auth/signin');
	}

	return (
		<main className="min-h-screen bg-gray-50 dark:bg-[#101622]">
			<div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
				<PageHeader
					title="Submit for Review"
					description="Upload an image to submit for review. Once approved, it will be scheduled for publishing."
					className="mb-8"
				/>
				<SubmitForm />
			</div>
		</main>
	);
}
