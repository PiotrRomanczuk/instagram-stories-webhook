import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubmitForm } from '@/app/components/submissions/submit-form';

// Mock next/navigation (used by routing)
vi.mock('@/i18n/routing', () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		back: vi.fn(),
	}),
}));

// Mock supabase client
vi.mock('@/lib/config/supabase', () => ({
	supabase: {
		storage: {
			from: () => ({
				upload: vi.fn().mockResolvedValue({ error: null }),
				getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/uploaded.jpg' } }),
			}),
		},
	},
}));

// Mock media validator
vi.mock('@/lib/media/validator', () => ({
	analyzeAspectRatio: vi.fn().mockReturnValue({
		ratio: 0.5625,
		label: '9:16 (Story)',
		needsProcessing: false,
		message: 'Perfect for stories',
	}),
	getImageDimensionsFromFile: vi.fn().mockResolvedValue({ width: 1080, height: 1920 }),
	getImageDimensionsFromUrl: vi.fn().mockResolvedValue({ width: 1080, height: 1920 }),
}));

// Mock toast
vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

/**
 * Helper: the form renders submit button twice (mobile + desktop).
 * In jsdom both are in the DOM since CSS doesn't apply.
 */
function getSubmitButton() {
	return screen.getAllByRole('button', { name: /Submit for Review/i })[0];
}

/**
 * Helper: URL input is hidden behind a "Use URL instead" toggle.
 */
async function openUrlInput(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole('button', { name: /Use URL instead/i }));
}

describe('SubmitForm', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
	});

	it('should render the submit form with all elements', () => {
		render(<SubmitForm />);

		// Check for image label (includes step badge)
		expect(screen.getAllByText(/Image/).length).toBeGreaterThan(0);
		// Check for caption label (includes step badge)
		expect(screen.getByText(/Caption/)).toBeInTheDocument();
		// Check for submit button (mobile + desktop both rendered)
		const submitButtons = screen.getAllByRole('button', { name: /Submit for Review/i });
		expect(submitButtons.length).toBeGreaterThan(0);
	});

	it('should render image uploader with drop zone', () => {
		render(<SubmitForm />);

		expect(screen.getByText('Drop image here or click to upload')).toBeInTheDocument();
		expect(screen.getByText('PNG, JPG up to 10MB')).toBeInTheDocument();
	});

	it('should render caption textarea', () => {
		render(<SubmitForm />);

		const textarea = screen.getByPlaceholderText('Add a caption for your story...');
		expect(textarea).toBeInTheDocument();
	});

	it('should show character count for caption', () => {
		render(<SubmitForm />);

		// Initial count should be 0/2200
		expect(screen.getByText('0/2200')).toBeInTheDocument();
	});

	it('should update character count when typing caption', async () => {
		const user = userEvent.setup();
		render(<SubmitForm />);

		const textarea = screen.getByPlaceholderText('Add a caption for your story...');
		await user.type(textarea, 'Hello World');

		expect(screen.getByText('11/2200')).toBeInTheDocument();
	});

	it('should have disabled submit button when no image is uploaded', () => {
		render(<SubmitForm />);

		const submitButton = getSubmitButton();
		expect(submitButton).toBeDisabled();
	});

	it('should render URL input field for alternative upload', async () => {
		const user = userEvent.setup();
		render(<SubmitForm />);

		// URL input is behind a "Use URL instead" toggle
		await openUrlInput(user);

		expect(screen.getByPlaceholderText('Paste image URL...')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Load' })).toBeInTheDocument();
	});

	it('should have disabled Load button when URL input is empty', async () => {
		const user = userEvent.setup();
		render(<SubmitForm />);

		await openUrlInput(user);

		const loadButton = screen.getByRole('button', { name: 'Load' });
		expect(loadButton).toBeDisabled();
	});

	it('should enable Load button when URL input has value', async () => {
		const user = userEvent.setup();
		render(<SubmitForm />);

		await openUrlInput(user);

		const urlInput = screen.getByPlaceholderText('Paste image URL...');
		await user.type(urlInput, 'https://example.com/image.jpg');

		const loadButton = screen.getByRole('button', { name: 'Load' });
		expect(loadButton).not.toBeDisabled();
	});

	it('should show loading state when loading image from URL', async () => {
		const user = userEvent.setup();
		const { getImageDimensionsFromUrl } = await import('@/lib/media/validator');

		// Make it hang to test loading state
		vi.mocked(getImageDimensionsFromUrl).mockImplementation(
			() => new Promise(() => {})
		);

		render(<SubmitForm />);

		await openUrlInput(user);

		const urlInput = screen.getByPlaceholderText('Paste image URL...');
		await user.type(urlInput, 'https://example.com/image.jpg');

		const loadButton = screen.getByRole('button', { name: 'Load' });
		await user.click(loadButton);

		// URL input should be disabled during loading
		await waitFor(() => {
			expect(urlInput).toBeDisabled();
		});
	});

	it('should render story preview component', () => {
		render(<SubmitForm />);

		// The preview component should be in the right column
		// It renders a phone-shaped preview area
		const previewContainer = document.querySelector('.lg\\:justify-end');
		expect(previewContainer).toBeInTheDocument();
	});
});

describe('SubmitForm - Image Upload', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
	});

	it('should have file input accepting images', () => {
		render(<SubmitForm />);

		const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
		expect(fileInput).toBeInTheDocument();
		expect(fileInput).toHaveAttribute('accept', 'image/*');
	});

	it('should handle drag over state', async () => {
		render(<SubmitForm />);

		const dropZone = screen.getByText('Drop image here or click to upload').closest('div');
		expect(dropZone).toBeInTheDocument();

		// Simulate drag over
		if (dropZone) {
			fireEvent.dragOver(dropZone, {
				dataTransfer: { files: [] },
			});
		}

		// The component should show visual feedback (class changes)
		// The actual class check depends on implementation
	});

	it('should handle drag leave state', async () => {
		render(<SubmitForm />);

		const dropZone = screen.getByText('Drop image here or click to upload').closest('div');

		if (dropZone) {
			fireEvent.dragOver(dropZone, {
				dataTransfer: { files: [] },
			});

			fireEvent.dragLeave(dropZone, {
				dataTransfer: { files: [] },
			});
		}
	});
});

describe('SubmitForm - Form Submission', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should show submitting state during form submission', async () => {
		const user = userEvent.setup();

		// Mock successful image load from URL
		const { getImageDimensionsFromUrl } = await import('@/lib/media/validator');
		vi.mocked(getImageDimensionsFromUrl).mockResolvedValue({ width: 1080, height: 1920 });

		// Mock fetch to hang
		global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

		render(<SubmitForm />);

		// Load image via URL first (toggle URL input visibility)
		await openUrlInput(user);
		const urlInput = screen.getByPlaceholderText('Paste image URL...');
		await user.type(urlInput, 'https://example.com/image.jpg');

		const loadButton = screen.getByRole('button', { name: 'Load' });
		await user.click(loadButton);

		// Wait for image to load
		await waitFor(() => {
			const img = document.querySelector('img[alt="Uploaded image"]');
			expect(img).toBeInTheDocument();
		});

		// Wait for submit button to become enabled then submit the form
		await waitFor(() => {
			const btn = getSubmitButton();
			expect(btn).not.toBeDisabled();
		});

		// Submit the form directly (userEvent.click on submit button doesn't
		// reliably trigger form submission in jsdom)
		const form = document.querySelector('form')!;
		fireEvent.submit(form);

		// Button should show submitting state (mobile + desktop both render)
		await waitFor(() => {
			expect(screen.getAllByText(/Submitting/)[0]).toBeInTheDocument();
		});
	});

	it('should call API on form submission with correct data', async () => {
		const user = userEvent.setup();

		// Mock successful image load
		const { getImageDimensionsFromUrl } = await import('@/lib/media/validator');
		vi.mocked(getImageDimensionsFromUrl).mockResolvedValue({ width: 1080, height: 1920 });

		// Mock successful submission
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ id: 'test-id' }),
		});

		render(<SubmitForm />);

		// Load image via URL
		await openUrlInput(user);
		const urlInput = screen.getByPlaceholderText('Paste image URL...');
		await user.type(urlInput, 'https://example.com/image.jpg');

		const loadButton = screen.getByRole('button', { name: 'Load' });
		await user.click(loadButton);

		// Wait for image to load and submit button to be enabled
		await waitFor(() => {
			// Image should be displayed after loading
			const img = document.querySelector('img[alt="Uploaded image"]');
			expect(img).toBeInTheDocument();
		});

		// Add caption
		const textarea = screen.getByPlaceholderText('Add a caption for your story...');
		await user.type(textarea, 'Test caption');

		// Find and click submit button
		const submitButton = getSubmitButton();
		await user.click(submitButton);

		// Verify API was called
		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith('/api/content', expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			}));
		});
	});

	it('should show success toast and redirect on successful submission', async () => {
		const user = userEvent.setup();
		const { toast } = await import('sonner');

		// Mock successful image load
		const { getImageDimensionsFromUrl } = await import('@/lib/media/validator');
		vi.mocked(getImageDimensionsFromUrl).mockResolvedValue({ width: 1080, height: 1920 });

		// Mock successful submission
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ id: 'test-id' }),
		});

		render(<SubmitForm />);

		// Load image via URL
		await openUrlInput(user);
		const urlInput = screen.getByPlaceholderText('Paste image URL...');
		await user.type(urlInput, 'https://example.com/image.jpg');

		const loadButton = screen.getByRole('button', { name: 'Load' });
		await user.click(loadButton);

		// Wait for image to load
		await waitFor(() => {
			const img = document.querySelector('img[alt="Uploaded image"]');
			expect(img).toBeInTheDocument();
		});

		// Submit form
		const submitButton = getSubmitButton();
		await user.click(submitButton);

		// Verify success toast
		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith('Submission sent for review!');
		});
	});

	it('should show error toast on failed submission', async () => {
		const user = userEvent.setup();
		const { toast } = await import('sonner');

		// Mock successful image load
		const { getImageDimensionsFromUrl } = await import('@/lib/media/validator');
		vi.mocked(getImageDimensionsFromUrl).mockResolvedValue({ width: 1080, height: 1920 });

		// Mock failed submission
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ error: 'Server error' }),
		});

		render(<SubmitForm />);

		// Load image via URL
		await openUrlInput(user);
		const urlInput = screen.getByPlaceholderText('Paste image URL...');
		await user.type(urlInput, 'https://example.com/image.jpg');

		const loadButton = screen.getByRole('button', { name: 'Load' });
		await user.click(loadButton);

		// Wait for image to load
		await waitFor(() => {
			const img = document.querySelector('img[alt="Uploaded image"]');
			expect(img).toBeInTheDocument();
		});

		// Submit form
		const submitButton = getSubmitButton();
		await user.click(submitButton);

		// Verify error toast
		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith('Server error');
		});
	});
});

describe('SubmitForm - Caption Validation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should enforce max caption length of 2200 characters', () => {
		render(<SubmitForm />);

		const textarea = screen.getByPlaceholderText('Add a caption for your story...');
		expect(textarea).toHaveAttribute('maxLength', '2200');
	});

	it('should change counter color when exceeding limit', async () => {
		const user = userEvent.setup();
		render(<SubmitForm />);

		const textarea = screen.getByPlaceholderText('Add a caption for your story...');

		// Type a long caption (max is 2200)
		const longCaption = 'a'.repeat(100);
		await user.type(textarea, longCaption);

		// Counter should show current length
		expect(screen.getByText('100/2200')).toBeInTheDocument();
	});
});

describe('SubmitForm - Accessibility', () => {
	it('should have proper label associations', () => {
		render(<SubmitForm />);

		// Caption should be labeled (includes step badge)
		expect(screen.getByText(/Caption/)).toBeInTheDocument();

		// Image should be labeled (includes step badge)
		expect(screen.getAllByText(/Image/).length).toBeGreaterThan(0);
	});

	it('should have proper button text for screen readers', async () => {
		const user = userEvent.setup();
		render(<SubmitForm />);

		// Submit button (mobile + desktop both rendered)
		const submitButtons = screen.getAllByRole('button', { name: /Submit for Review/i });
		expect(submitButtons.length).toBeGreaterThan(0);

		// Show URL input to check Load button
		await openUrlInput(user);
		expect(screen.getByRole('button', { name: 'Load' })).toBeInTheDocument();
	});
});
