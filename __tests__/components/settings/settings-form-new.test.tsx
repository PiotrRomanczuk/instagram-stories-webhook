import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../setup';
import { SettingsFormNew } from '@/app/components/settings/settings-form-new';

// Mock clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
	value: {
		writeText: mockWriteText,
	},
	writable: true,
	configurable: true,
});

const mockConfig = {
	appUrl: 'http://localhost:3000',
	adminEmail: 'admin@test.com',
	google: {
		clientId: 'google-client-id',
		clientSecret: 'google-secret',
	},
	facebook: {
		appId: 'fb-app-id',
		appSecret: 'fb-secret',
	},
	supabase: {
		url: 'https://test.supabase.co',
		anonKey: 'anon-key',
		serviceRoleKey: 'service-role-key',
		jwtSecret: 'jwt-secret',
		databasePassword: 'db-password',
	},
	security: {
		webhookSecret: 'webhook-secret',
		cronSecret: 'cron-secret',
		nextAuthSecret: 'nextauth-secret',
	},
	lastUpdated: '2024-01-01T00:00:00.000Z',
};

describe('SettingsFormNew', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default handler for config endpoint
		server.use(
			http.get('/api/config', () => {
				return HttpResponse.json({
					config: mockConfig,
					hasConfig: true,
				});
			})
		);
	});

	it('renders loading state initially', () => {
		// Override to delay response
		server.use(
			http.get('/api/config', async () => {
				await new Promise((resolve) => setTimeout(resolve, 100));
				return HttpResponse.json({
					config: mockConfig,
					hasConfig: true,
				});
			})
		);

		render(<SettingsFormNew />);

		// Should show loading spinner (the RefreshCw icon that spins)
		expect(document.querySelector('.animate-spin')).toBeInTheDocument();
	});

	it('fetches and displays config on mount', async () => {
		render(<SettingsFormNew />);

		await waitFor(() => {
			expect(screen.getByLabelText('Application URL')).toHaveValue(
				'http://localhost:3000'
			);
		});

		expect(screen.getByLabelText('Admin Email')).toHaveValue('admin@test.com');
		expect(screen.getByLabelText('Google Client ID')).toHaveValue('google-client-id');
	});

	it('shows configuration required alert when no config exists', async () => {
		server.use(
			http.get('/api/config', () => {
				return HttpResponse.json({
					config: mockConfig,
					hasConfig: false,
				});
			})
		);

		render(<SettingsFormNew />);

		await waitFor(() => {
			expect(screen.getByText('Configuration Required')).toBeInTheDocument();
		});
	});

	it('updates config values when inputs change', async () => {
		render(<SettingsFormNew />);

		await waitFor(() => {
			expect(screen.getByLabelText('Application URL')).toBeInTheDocument();
		});

		const appUrlInput = screen.getByLabelText('Application URL');
		fireEvent.change(appUrlInput, { target: { value: 'http://newurl.com' } });

		expect(appUrlInput).toHaveValue('http://newurl.com');
	});

	it('toggles password visibility for secret fields', async () => {
		render(<SettingsFormNew />);

		await waitFor(() => {
			expect(screen.getByLabelText('Google Client Secret')).toBeInTheDocument();
		});

		const secretInput = screen.getByLabelText('Google Client Secret');
		expect(secretInput).toHaveAttribute('type', 'password');

		// Find the eye button near the secret input - look for the parent container
		const secretContainer = secretInput.closest('.relative');
		const toggleButton = secretContainer?.querySelector('button');

		if (toggleButton) {
			fireEvent.click(toggleButton);
			expect(secretInput).toHaveAttribute('type', 'text');
		}
	});

	it('copies value to clipboard when copy button is clicked', async () => {
		render(<SettingsFormNew />);

		await waitFor(() => {
			expect(screen.getByLabelText('Application URL')).toBeInTheDocument();
		});

		// Find the Application URL input container and its copy button
		const appUrlInput = screen.getByLabelText('Application URL');
		const container = appUrlInput.closest('.relative');
		const copyButton = container?.querySelectorAll('button')[0]; // First button (copy)

		if (copyButton) {
			fireEvent.click(copyButton);
			expect(mockWriteText).toHaveBeenCalledWith('http://localhost:3000');
		}
	});

	it('generates all security secrets when Generate All button is clicked', async () => {
		render(<SettingsFormNew />);

		await waitFor(() => {
			expect(screen.getByText('Generate All')).toBeInTheDocument();
		});

		const webhookSecretInput = screen.getByLabelText('Webhook Secret') as HTMLInputElement;
		const originalValue = webhookSecretInput.value;

		const generateButton = screen.getByText('Generate All');
		fireEvent.click(generateButton);

		// The secret fields should have new values (different from original)
		await waitFor(() => {
			expect(webhookSecretInput.value).not.toBe(originalValue);
			expect(webhookSecretInput.value).toHaveLength(32);
		});
	});

	it('saves configuration when Save button is clicked', async () => {
		let postCalled = false;

		server.use(
			http.post('/api/config', () => {
				postCalled = true;
				return HttpResponse.json({ envContent: 'APP_URL=http://localhost:3000' });
			})
		);

		render(<SettingsFormNew />);

		await waitFor(() => {
			expect(screen.getByText('Save Configuration')).toBeInTheDocument();
		});

		const saveButton = screen.getByText('Save Configuration');
		await act(async () => {
			fireEvent.click(saveButton);
		});

		await waitFor(() => {
			expect(postCalled).toBe(true);
		});
	});

	it('shows success message after successful save', async () => {
		server.use(
			http.post('/api/config', () => {
				return HttpResponse.json({ envContent: 'APP_URL=http://localhost:3000' });
			})
		);

		render(<SettingsFormNew />);

		await waitFor(() => {
			expect(screen.getByText('Save Configuration')).toBeInTheDocument();
		});

		const saveButton = screen.getByText('Save Configuration');
		await act(async () => {
			fireEvent.click(saveButton);
		});

		await waitFor(() => {
			expect(screen.getByText('Configuration saved successfully!')).toBeInTheDocument();
		});
	});

	it('shows error message when save fails', async () => {
		server.use(
			http.post('/api/config', () => {
				return new HttpResponse(null, { status: 500 });
			})
		);

		render(<SettingsFormNew />);

		await waitFor(() => {
			expect(screen.getByText('Save Configuration')).toBeInTheDocument();
		});

		const saveButton = screen.getByText('Save Configuration');
		await act(async () => {
			fireEvent.click(saveButton);
		});

		await waitFor(() => {
			expect(screen.getByText('Failed to save. Check console for errors.')).toBeInTheDocument();
		});
	});

	it('toggles .env preview visibility', async () => {
		server.use(
			http.post('/api/config', () => {
				return HttpResponse.json({ envContent: 'APP_URL=http://localhost:3000' });
			})
		);

		render(<SettingsFormNew />);

		await waitFor(() => {
			expect(screen.getByText('Save Configuration')).toBeInTheDocument();
		});

		// Save first to get env content
		const saveButton = screen.getByText('Save Configuration');
		await act(async () => {
			fireEvent.click(saveButton);
		});

		await waitFor(() => {
			expect(screen.getByText('Show .env')).toBeInTheDocument();
		});

		// Toggle show
		fireEvent.click(screen.getByText('Show .env'));

		await waitFor(() => {
			expect(screen.getByText('Hide .env')).toBeInTheDocument();
			expect(screen.getByText('Generated .env.local')).toBeInTheDocument();
		});
	});

	it('renders all configuration sections', async () => {
		render(<SettingsFormNew />);

		await waitFor(() => {
			expect(screen.getByText('Application Settings')).toBeInTheDocument();
		});

		expect(screen.getByText('Google OAuth')).toBeInTheDocument();
		expect(screen.getByText('Meta / Facebook')).toBeInTheDocument();
		expect(screen.getByText('Supabase Database')).toBeInTheDocument();
		expect(screen.getByText('Security Secrets')).toBeInTheDocument();
	});

	it('displays help links for relevant fields', async () => {
		render(<SettingsFormNew />);

		await waitFor(() => {
			expect(screen.getByLabelText('Google Client ID')).toBeInTheDocument();
		});

		const helpLinks = screen.getAllByText('Help');
		expect(helpLinks.length).toBeGreaterThan(0);

		// Check that help links point to correct URLs
		const googleHelpLink = helpLinks[0].closest('a');
		expect(googleHelpLink).toHaveAttribute(
			'href',
			'https://console.cloud.google.com/apis/credentials'
		);
	});

	it('displays last saved timestamp when available', async () => {
		render(<SettingsFormNew />);

		await waitFor(() => {
			expect(screen.getByText(/Last saved:/)).toBeInTheDocument();
		});
	});
});
