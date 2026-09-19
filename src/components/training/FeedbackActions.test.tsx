import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FeedbackActions } from './FeedbackActions';

describe('FeedbackActions', () => {
  it('submits each feedback response', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <FeedbackActions
        displayName="Basketball Court"
        emoji="B"
        onSubmit={onSubmit}
        disabled={false}
      />
    );

    expect(screen.getByText('Is this a Basketball Court?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /no/i }));
    await user.click(screen.getByRole('button', { name: /unsure/i }));
    await user.click(screen.getByRole('button', { name: /yes/i }));

    expect(onSubmit.mock.calls.map(([response]) => response)).toEqual([
      'no',
      'unsure',
      'yes',
    ]);
  });

  it('disables feedback buttons while submitting', () => {
    render(
      <FeedbackActions
        displayName="Basketball Court"
        emoji="B"
        onSubmit={vi.fn()}
        disabled
      />
    );

    expect(screen.getByRole('button', { name: /no/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /unsure/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /yes/i })).toBeDisabled();
  });
});
