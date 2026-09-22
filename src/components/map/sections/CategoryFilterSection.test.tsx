import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoryFilterSection } from './CategoryFilterSection';

const categories = ['basketball-court', 'tennis-court', 'baseball-diamond'];

describe('CategoryFilterSection', () => {
  it('supports persisted multi-select, All, and Clear actions', () => {
    const onCategoriesChange = vi.fn();

    render(
      <CategoryFilterSection
        categories={categories}
        enabledCategories={['basketball-court']}
        onCategoriesChange={onCategoriesChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Tennis Court/ }));
    expect(onCategoriesChange).toHaveBeenLastCalledWith([
      'basketball-court',
      'tennis-court',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(onCategoriesChange).toHaveBeenLastCalledWith(categories);

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onCategoriesChange).toHaveBeenLastCalledWith([]);
  });
});
