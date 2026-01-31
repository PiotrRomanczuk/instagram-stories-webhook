import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UsersTable } from '@/app/components/users/users-table';
import { AllowedUser } from '@/lib/types';

const mockUsers: AllowedUser[] = [
	{
		id: '1',
		email: 'user1@example.com',
		role: 'user',
		display_name: 'User One',
		created_at: '2024-01-15T10:00:00Z',
	},
	{
		id: '2',
		email: 'admin@example.com',
		role: 'admin',
		display_name: 'Admin User',
		created_at: '2024-01-10T10:00:00Z',
	},
	{
		id: '3',
		email: 'dev@example.com',
		role: 'developer',
		created_at: '2024-01-01T10:00:00Z',
	},
];

describe('UsersTable', () => {
	const mockOnChangeRole = vi.fn();
	const mockOnRemove = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render users in a table', () => {
		render(
			<UsersTable
				users={mockUsers}
				onChangeRole={mockOnChangeRole}
				onRemove={mockOnRemove}
			/>
		);

		expect(screen.getByText('user1@example.com')).toBeInTheDocument();
		expect(screen.getByText('admin@example.com')).toBeInTheDocument();
		expect(screen.getByText('dev@example.com')).toBeInTheDocument();
	});

	it('should show empty state when no users', () => {
		render(
			<UsersTable
				users={[]}
				onChangeRole={mockOnChangeRole}
				onRemove={mockOnRemove}
			/>
		);

		expect(screen.getByText('No users yet')).toBeInTheDocument();
	});

	it('should show loading skeleton when isLoading is true', () => {
		const { container } = render(
			<UsersTable
				users={[]}
				isLoading={true}
				onChangeRole={mockOnChangeRole}
				onRemove={mockOnRemove}
			/>
		);

		const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it('should display table headers', () => {
		render(
			<UsersTable
				users={mockUsers}
				onChangeRole={mockOnChangeRole}
				onRemove={mockOnRemove}
			/>
		);

		const columnHeaders = screen.getAllByRole('columnheader');
		const headerTexts = columnHeaders.map((h) => h.textContent);

		expect(headerTexts).toContain('Email');
		expect(headerTexts).toContain('Display Name');
		expect(headerTexts).toContain('Role');
		expect(headerTexts).toContain('Added');
		expect(headerTexts).toContain('Actions');
	});

	it('should display role badges for each user', () => {
		render(
			<UsersTable
				users={mockUsers}
				onChangeRole={mockOnChangeRole}
				onRemove={mockOnRemove}
			/>
		);

		expect(screen.getByText('User')).toBeInTheDocument();
		expect(screen.getByText('Admin')).toBeInTheDocument();
		expect(screen.getByText('Developer')).toBeInTheDocument();
	});

	it('should display display names when provided', () => {
		render(
			<UsersTable
				users={mockUsers}
				onChangeRole={mockOnChangeRole}
				onRemove={mockOnRemove}
			/>
		);

		expect(screen.getByText('User One')).toBeInTheDocument();
		expect(screen.getByText('Admin User')).toBeInTheDocument();
	});

	it('should show "You" badge for current user', () => {
		render(
			<UsersTable
				users={mockUsers}
				currentUserEmail="admin@example.com"
				onChangeRole={mockOnChangeRole}
				onRemove={mockOnRemove}
			/>
		);

		expect(screen.getByText('You')).toBeInTheDocument();
	});

	it('should disable actions for current user', () => {
		render(
			<UsersTable
				users={mockUsers}
				currentUserEmail="admin@example.com"
				onChangeRole={mockOnChangeRole}
				onRemove={mockOnRemove}
			/>
		);

		// Find the row for current user and check that its action button is disabled
		const rows = screen.getAllByRole('row');
		// Find the admin row (second data row, third row overall including header)
		const adminRow = rows.find((row) => row.textContent?.includes('admin@example.com'));
		expect(adminRow).toBeDefined();

		// The dropdown trigger in this row should be disabled
		const button = adminRow?.querySelector('button');
		expect(button).toBeDisabled();
	});

	it('should display formatted date', () => {
		render(
			<UsersTable
				users={mockUsers}
				onChangeRole={mockOnChangeRole}
				onRemove={mockOnRemove}
			/>
		);

		expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
		expect(screen.getByText('Jan 10, 2024')).toBeInTheDocument();
		expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
	});
});
