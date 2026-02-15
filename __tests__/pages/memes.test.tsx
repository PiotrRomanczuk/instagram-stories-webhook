import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemesPageClient } from '@/app/[locale]/memes/memes-page-client';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
	useSession: vi.fn(() => ({
		data: { user: { id: 'user-123', email: 'user@example.com', role: 'user' } },
		status: 'authenticated',
	})),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
	useSearchParams: vi.fn(() => ({
		get: vi.fn(() => null),
	})),
}));

// Mock i18n routing Link
vi.mock('@/i18n/routing', () => ({
	Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
		<a href={href} className={className}>{children}</a>
	),
}));

// Mock MemesDashboard component
vi.mock('@/app/components/memes/memes-dashboard', () => ({
	MemesDashboard: () => <div data-testid="memes-dashboard">Memes Dashboard Component</div>,
}));

describe('Memes Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		it('renders without crashing', () => {
			render(<MemesPageClient />);
			expect(screen.getByRole('main')).toBeInTheDocument();
		});

		it('displays Community Meme Hub heading', () => {
			render(<MemesPageClient />);
			expect(screen.getByText('Community')).toBeInTheDocument();
			expect(screen.getByText('Meme Hub')).toBeInTheDocument();
		});

		it('displays page description', () => {
			render(<MemesPageClient />);
			expect(
				screen.getByText(/Submit your best memes for a chance to be featured on our Instagram/)
			).toBeInTheDocument();
		});
	});

	describe('navigation', () => {
		it('has back to dashboard link', () => {
			render(<MemesPageClient />);
			const backLink = screen.getByText('Back to Dashboard');
			expect(backLink).toBeInTheDocument();
			expect(backLink.closest('a')).toHaveAttribute('href', '/');
		});

		it('back link has correct styling classes', () => {
			render(<MemesPageClient />);
			const backLink = screen.getByText('Back to Dashboard').closest('a');
			expect(backLink).toHaveClass('inline-flex');
			expect(backLink).toHaveClass('items-center');
		});
	});

	describe('MemesDashboard component', () => {
		it('renders the MemesDashboard component', () => {
			render(<MemesPageClient />);
			expect(screen.getByTestId('memes-dashboard')).toBeInTheDocument();
		});
	});

	describe('footer', () => {
		it('displays footer text', () => {
			render(<MemesPageClient />);
			expect(screen.getByText(/Community Feature/)).toBeInTheDocument();
			expect(screen.getByText(/Instagram Story Submissions/)).toBeInTheDocument();
		});
	});

	describe('layout', () => {
		it('has correct main container styling', () => {
			render(<MemesPageClient />);
			const main = screen.getByRole('main');
			expect(main).toHaveClass('min-h-screen');
		});

		it('has hero header section', () => {
			render(<MemesPageClient />);
			const heroSection = document.querySelector('.border-b');
			expect(heroSection).toBeInTheDocument();
		});
	});

	describe('visual elements', () => {
		it('has sparkles icon', () => {
			render(<MemesPageClient />);
			const sparklesContainer = document.querySelector('.animate-bounce');
			expect(sparklesContainer).toBeInTheDocument();
		});

		it('has gradient text styling', () => {
			render(<MemesPageClient />);
			const gradientText = document.querySelector('.bg-gradient-to-r');
			expect(gradientText).toBeInTheDocument();
		});
	});
});
