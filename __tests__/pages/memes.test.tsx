import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MemesPage from '@/app/[locale]/memes/page';

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
			render(<MemesPage />);
			expect(screen.getByRole('main')).toBeInTheDocument();
		});

		it('displays Community Meme Hub heading', () => {
			render(<MemesPage />);
			expect(screen.getByText('Community')).toBeInTheDocument();
			expect(screen.getByText('Meme Hub')).toBeInTheDocument();
		});

		it('displays page description', () => {
			render(<MemesPage />);
			expect(
				screen.getByText(/Submit your best memes for a chance to be featured on our Instagram/)
			).toBeInTheDocument();
		});
	});

	describe('navigation', () => {
		it('has back to dashboard link', () => {
			render(<MemesPage />);
			const backLink = screen.getByText('Back to Dashboard');
			expect(backLink).toBeInTheDocument();
			expect(backLink.closest('a')).toHaveAttribute('href', '/');
		});

		it('back link has correct styling classes', () => {
			render(<MemesPage />);
			const backLink = screen.getByText('Back to Dashboard').closest('a');
			expect(backLink).toHaveClass('inline-flex');
			expect(backLink).toHaveClass('items-center');
		});
	});

	describe('MemesDashboard component', () => {
		it('renders the MemesDashboard component', () => {
			render(<MemesPage />);
			expect(screen.getByTestId('memes-dashboard')).toBeInTheDocument();
		});
	});

	describe('footer', () => {
		it('displays footer text', () => {
			render(<MemesPage />);
			expect(screen.getByText(/Community Feature/)).toBeInTheDocument();
			expect(screen.getByText(/Instagram Story Submissions/)).toBeInTheDocument();
		});
	});

	describe('layout', () => {
		it('has correct main container styling', () => {
			render(<MemesPage />);
			const main = screen.getByRole('main');
			expect(main).toHaveClass('min-h-screen');
		});

		it('has hero header section', () => {
			render(<MemesPage />);
			// The hero section has the border-b class
			const heroSection = document.querySelector('.border-b');
			expect(heroSection).toBeInTheDocument();
		});
	});

	describe('visual elements', () => {
		it('has sparkles icon', () => {
			render(<MemesPage />);
			// The sparkles icon container has animate-bounce class
			const sparklesContainer = document.querySelector('.animate-bounce');
			expect(sparklesContainer).toBeInTheDocument();
		});

		it('has gradient text styling', () => {
			render(<MemesPage />);
			const gradientText = document.querySelector('.bg-gradient-to-r');
			expect(gradientText).toBeInTheDocument();
		});
	});
});
