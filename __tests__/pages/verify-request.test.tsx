import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import VerifyRequest from '@/app/[locale]/auth/verify-request/page';

describe('VerifyRequest Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders without crashing', () => {
		render(<VerifyRequest />);
		expect(screen.getByText('Check your email')).toBeInTheDocument();
	});

	it('displays the email verification message', () => {
		render(<VerifyRequest />);
		expect(
			screen.getByText(/A magic link has been sent to your email address/i)
		).toBeInTheDocument();
		expect(
			screen.getByText(/Click the link in the email to sign in instantly/i)
		).toBeInTheDocument();
	});

	it('shows spam folder hint', () => {
		render(<VerifyRequest />);
		expect(
			screen.getByText(/Didn't receive the email\? Check your spam folder or try again/i)
		).toBeInTheDocument();
	});

	it('displays back to login link', () => {
		render(<VerifyRequest />);
		const backLink = screen.getByRole('link', { name: /Back to Login/i });
		expect(backLink).toBeInTheDocument();
		expect(backLink).toHaveAttribute('href', '/auth/signin');
	});

	it('displays the mail icon', () => {
		const { container } = render(<VerifyRequest />);
		// The Mail icon from lucide-react renders as an SVG
		const iconContainer = container.querySelector('.bg-indigo-50');
		expect(iconContainer).toBeInTheDocument();
	});

	it('displays security footer text', () => {
		render(<VerifyRequest />);
		expect(
			screen.getByText(/Safety first • No passwords required/i)
		).toBeInTheDocument();
	});

	it('has correct page structure with centered layout', () => {
		const { container } = render(<VerifyRequest />);
		const mainContainer = container.querySelector('.min-h-screen');
		expect(mainContainer).toHaveClass('flex', 'items-center', 'justify-center');
	});

	it('renders card with proper styling', () => {
		const { container } = render(<VerifyRequest />);
		const card = container.querySelector('.bg-white');
		expect(card).toBeInTheDocument();
		expect(card).toHaveClass('rounded-[32px]');
	});
});
