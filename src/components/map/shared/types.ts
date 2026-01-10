import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Button Control Types (for CustomNavigationControls)
// ============================================================================

export type MapControlButtonVariant = 'ghost' | 'default' | 'outline';

export interface MapControlButtonConfig {
  id: string;
  icon: ReactNode;
  label: string;
  variant?: MapControlButtonVariant;
  onClick: () => void;
  disabled?: boolean;
  show?: boolean;
  order?: number;
  renderIcon?: (icon: ReactNode) => ReactNode;
  className?: string;
  ariaLabel?: string;
}

export type MapControlLayout = 'vertical' | 'horizontal' | 'grid';

export interface MapControlPosition {
  top?: string | number;
  bottom?: string | number;
  left?: string | number;
  right?: string | number;
}

// ============================================================================
// Section Types (for MapControls)
// ============================================================================

export type MapSectionVariant = 'default' | 'compact' | 'minimal';

export interface MapSectionConfig {
  id: string;
  title?: string;
  icon?: ReactNode;
  variant?: MapSectionVariant;
  show?: boolean;
  order?: number;
  className?: string;
  renderContent: () => ReactNode;
}

// ============================================================================
// Shared Styles
// ============================================================================

export const mapControlButtonClassName =
  'h-10 w-10 rounded-full shadow-md bg-background border-border/50 text-foreground hover:bg-muted';

export const mapSectionHeaderClassName = 'flex items-center gap-2';
export const mapSectionTitleClassName = 'font-display text-sm font-semibold tracking-tight';
export const mapSectionIconClassName = 'h-4 w-4 text-muted-foreground';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Combines class names using the cn utility
 */
export function combineClasses(...classes: (string | undefined | false | null)[]): string {
  return cn(...classes);
}

/**
 * Sorts items by their order property (if present)
 */
export function sortSections<T extends { order?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Filters items based on show property (if present)
 */
export function filterSections<T extends { show?: boolean }>(items: T[]): T[] {
  return items.filter((item) => item.show !== false);
}
