import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemeEditModal } from '@/app/components/memes/meme-edit-modal';
import { MemeSubmission } from '@/lib/types';

const mockMeme: MemeSubmission = {
    id: 'm1',
    user_id: 'u1',
    user_email: 'user@example.com',
    title: 'Original Title',
    caption: 'Original Caption',
    media_url: 'https://example.com/image.jpg',
    status: 'pending',
    created_at: new Date().toISOString(),
};

describe('MemeEditModal', () => {
    it('should render modal when open', () => {
        const onSave = vi.fn();
        const onClose = vi.fn();

        render(
            <MemeEditModal
                isOpen={true}
                onClose={onClose}
                meme={mockMeme}
                onSave={onSave}
            />
        );

        expect(screen.getByText('Edit Meme Submission')).toBeInTheDocument();
        expect(screen.getByDisplayValue(mockMeme.title!)).toBeInTheDocument();
        expect(screen.getByDisplayValue(mockMeme.caption!)).toBeInTheDocument();
    });

    it('should not render modal when closed', () => {
        const onSave = vi.fn();
        const onClose = vi.fn();

        render(
            <MemeEditModal
                isOpen={false}
                onClose={onClose}
                meme={mockMeme}
                onSave={onSave}
            />
        );

        expect(screen.queryByText('Edit Meme Submission')).not.toBeInTheDocument();
    });

    it('should populate fields with meme data', () => {
        const onSave = vi.fn();
        const onClose = vi.fn();

        render(
            <MemeEditModal
                isOpen={true}
                onClose={onClose}
                meme={mockMeme}
                onSave={onSave}
            />
        );

        const titleInput = screen.getByDisplayValue('Original Title') as HTMLInputElement;
        const captionInput = screen.getByDisplayValue('Original Caption') as HTMLTextAreaElement;

        expect(titleInput.value).toBe('Original Title');
        expect(captionInput.value).toBe('Original Caption');
    });

    it('should update title when user types', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        const onClose = vi.fn();

        render(
            <MemeEditModal
                isOpen={true}
                onClose={onClose}
                meme={mockMeme}
                onSave={onSave}
            />
        );

        const titleInput = screen.getByDisplayValue('Original Title') as HTMLInputElement;
        await user.clear(titleInput);
        await user.type(titleInput, 'New Title');

        expect(titleInput.value).toBe('New Title');
    });

    it('should update caption when user types', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        const onClose = vi.fn();

        render(
            <MemeEditModal
                isOpen={true}
                onClose={onClose}
                meme={mockMeme}
                onSave={onSave}
            />
        );

        const captionInput = screen.getByDisplayValue('Original Caption') as HTMLTextAreaElement;
        await user.clear(captionInput);
        await user.type(captionInput, 'New Caption');

        expect(captionInput.value).toBe('New Caption');
    });

    it('should show error when both fields are empty', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        const onClose = vi.fn();

        render(
            <MemeEditModal
                isOpen={true}
                onClose={onClose}
                meme={mockMeme}
                onSave={onSave}
            />
        );

        const titleInput = screen.getByDisplayValue('Original Title') as HTMLInputElement;
        const captionInput = screen.getByDisplayValue('Original Caption') as HTMLTextAreaElement;

        await user.clear(titleInput);
        await user.clear(captionInput);

        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        await user.click(saveButton);

        expect(screen.getByText(/At least title or caption is required/i)).toBeInTheDocument();
        expect(onSave).not.toHaveBeenCalled();
    });

    it('should call onSave with updated title only', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        const onClose = vi.fn();

        render(
            <MemeEditModal
                isOpen={true}
                onClose={onClose}
                meme={mockMeme}
                onSave={onSave}
            />
        );

        const titleInput = screen.getByDisplayValue('Original Title') as HTMLInputElement;
        const captionInput = screen.getByDisplayValue('Original Caption') as HTMLTextAreaElement;

        await user.clear(titleInput);
        await user.type(titleInput, 'Updated Title');
        await user.clear(captionInput);

        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        await user.click(saveButton);

        await waitFor(() => {
            expect(onSave).toHaveBeenCalledWith({ title: 'Updated Title' });
        });
    });

    it('should call onSave with updated caption only', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        const onClose = vi.fn();

        render(
            <MemeEditModal
                isOpen={true}
                onClose={onClose}
                meme={mockMeme}
                onSave={onSave}
            />
        );

        const titleInput = screen.getByDisplayValue('Original Title') as HTMLInputElement;
        const captionInput = screen.getByDisplayValue('Original Caption') as HTMLTextAreaElement;

        await user.clear(titleInput);
        await user.clear(captionInput);
        await user.type(captionInput, 'Updated Caption');

        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        await user.click(saveButton);

        await waitFor(() => {
            expect(onSave).toHaveBeenCalledWith({ caption: 'Updated Caption' });
        });
    });

    it('should call onSave with both updated fields', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        const onClose = vi.fn();

        render(
            <MemeEditModal
                isOpen={true}
                onClose={onClose}
                meme={mockMeme}
                onSave={onSave}
            />
        );

        const titleInput = screen.getByDisplayValue('Original Title') as HTMLInputElement;
        const captionInput = screen.getByDisplayValue('Original Caption') as HTMLTextAreaElement;

        await user.clear(titleInput);
        await user.type(titleInput, 'Updated Title');
        await user.clear(captionInput);
        await user.type(captionInput, 'Updated Caption');

        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        await user.click(saveButton);

        await waitFor(() => {
            expect(onSave).toHaveBeenCalledWith({
                title: 'Updated Title',
                caption: 'Updated Caption',
            });
        });
    });

    it('should enforce character limits on maxLength attributes', () => {
        const onSave = vi.fn();
        const onClose = vi.fn();

        render(
            <MemeEditModal
                isOpen={true}
                onClose={onClose}
                meme={mockMeme}
                onSave={onSave}
            />
        );

        const titleInput = screen.getByDisplayValue('Original Title') as HTMLInputElement;
        const captionInput = screen.getByDisplayValue('Original Caption') as HTMLTextAreaElement;

        // Check maxLength attributes
        expect(titleInput.maxLength).toBe(100);
        expect(captionInput.maxLength).toBe(2200);
    });

    it('should close modal on cancel', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        const onClose = vi.fn();

        render(
            <MemeEditModal
                isOpen={true}
                onClose={onClose}
                meme={mockMeme}
                onSave={onSave}
            />
        );

        const cancelButton = screen.getByRole('button', { name: /Cancel/i });
        await user.click(cancelButton);

        expect(onClose).toHaveBeenCalled();
    });

    it('should show character counters', () => {
        const onSave = vi.fn();
        const onClose = vi.fn();

        render(
            <MemeEditModal
                isOpen={true}
                onClose={onClose}
                meme={mockMeme}
                onSave={onSave}
            />
        );

        expect(screen.getByText(/\/100/)).toBeInTheDocument();
        expect(screen.getByText(/\/2200/)).toBeInTheDocument();
    });
});
