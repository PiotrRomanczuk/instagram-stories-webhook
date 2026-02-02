import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next-auth
vi.mock('next-auth/next', () => ({
	getServerSession: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
	redirect: vi.fn(),
}));

// Mock next/link
vi.mock('next/link', () => ({
	default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
		<a href={href} className={className}>{children}</a>
	),
}));

// Mock MemeSubmitForm component
vi.mock('@/app/components/memes/meme-submit-form', () => ({
	MemeSubmitForm: () => (
		<form data-testid="meme-submit-form">
			<div>Meme Submit Form Component</div>
			<label htmlFor="title">Meme Title</label>
			<input id="title" type="text" placeholder="A catchy title..." />
			<label htmlFor="caption">IG Caption</label>
			<input id="caption" type="text" placeholder="Add a fun caption..." />
			<button type="submit">Submit Meme for Review</button>
		</form>
	),
}));

// Test helper to render async server component
async function renderMemesSubmitPage() {
	const { getServerSession } = await import('next-auth/next');

	// Setup mocks for successful render
	vi.mocked(getServerSession).mockResolvedValue({
		user: { id: 'user-123', email: 'user@example.com' },
	} as never);

	const SubmitMemePage = (await import('@/app/[locale]/memes/submit/page')).default;
	const page = await SubmitMemePage();
	render(page);
}

describe('Memes Submit Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		it('renders without crashing', async () => {
			await renderMemesSubmitPage();
			expect(screen.getByRole('main')).toBeInTheDocument();
		});

		it('displays Submit a Meme heading', async () => {
			await renderMemesSubmitPage();
			expect(screen.getByText('Submit a Meme')).toBeInTheDocument();
		});

		it('displays page description', async () => {
			await renderMemesSubmitPage();
			expect(screen.getByText('Share your best memes with us')).toBeInTheDocument();
		});
	});

	describe('navigation', () => {
		it('has back to submissions link', async () => {
			await renderMemesSubmitPage();
			const backLink = screen.getByText('My Submissions');
			expect(backLink).toBeInTheDocument();
			expect(backLink.closest('a')).toHaveAttribute('href', '/memes');
		});
	});

	describe('form rendering', () => {
		it('renders the MemeSubmitForm component', async () => {
			await renderMemesSubmitPage();
			expect(screen.getByTestId('meme-submit-form')).toBeInTheDocument();
		});

		it('form has title input', async () => {
			await renderMemesSubmitPage();
			expect(screen.getByLabelText('Meme Title')).toBeInTheDocument();
		});

		it('form has caption input', async () => {
			await renderMemesSubmitPage();
			expect(screen.getByLabelText('IG Caption')).toBeInTheDocument();
		});

		it('form has submit button', async () => {
			await renderMemesSubmitPage();
			expect(screen.getByRole('button', { name: /Submit Meme for Review/i })).toBeInTheDocument();
		});
	});

	describe('access control', () => {
		it('redirects to signin if no session', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { redirect } = await import('next/navigation');

			vi.mocked(getServerSession).mockResolvedValue(null);

			const SubmitMemePage = (await import('@/app/[locale]/memes/submit/page')).default;
			await SubmitMemePage();

			expect(redirect).toHaveBeenCalledWith('/auth/signin');
		});

		it('redirects to signin if session has no user id', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { redirect } = await import('next/navigation');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: 'user@example.com' },
			} as never);

			const SubmitMemePage = (await import('@/app/[locale]/memes/submit/page')).default;
			await SubmitMemePage();

			expect(redirect).toHaveBeenCalledWith('/auth/signin');
		});

		it('allows authenticated user to access', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { redirect } = await import('next/navigation');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'user-123', email: 'user@example.com' },
			} as never);

			const SubmitMemePage = (await import('@/app/[locale]/memes/submit/page')).default;
			const page = await SubmitMemePage();

			// Should not redirect
			expect(redirect).not.toHaveBeenCalled();
			// Page should be returned
			expect(page).toBeDefined();
		});
	});

	describe('layout', () => {
		it('has correct main container styling', async () => {
			await renderMemesSubmitPage();
			const main = screen.getByRole('main');
			expect(main).toHaveClass('min-h-screen');
		});

		it('has form card container', async () => {
			await renderMemesSubmitPage();
			// The form container has rounded-3xl class
			const formContainer = document.querySelector('.rounded-3xl');
			expect(formContainer).toBeInTheDocument();
		});
	});

	describe('visual elements', () => {
		it('has sparkles icon container', async () => {
			await renderMemesSubmitPage();
			// The sparkles icon is in a rounded-2xl container
			const iconContainer = document.querySelector('.rounded-2xl.bg-gradient-to-br');
			expect(iconContainer).toBeInTheDocument();
		});
	});
});
