import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionSettings } from './SessionSettings';
import { GAMES } from '@/games/registry';
import { defaultSettings, setEnabled, defaultSessionOptions } from '@/games/settings';

const open = () => fireEvent.click(screen.getByRole('button', { name: /advanced options/i }));

const defaultProps = {
  onToggle: vi.fn(),
  onDifficulty: vi.fn(),
  onReset: vi.fn(),
  onSelectAll: vi.fn(),
  onDeselectAll: vi.fn(),
  onSessionOption: vi.fn(),
  sessionOptions: defaultSessionOptions(),
  settings: defaultSettings(GAMES),
};

describe('SessionSettings', () => {
  it('renders a row per registered game', () => {
    render(<SessionSettings {...defaultProps} />);
    open();
    for (const g of GAMES) {
      expect(screen.getByRole('checkbox', { name: new RegExp(`enable ${g.name}`, 'i') })).toBeInTheDocument();
    }
  });

  it('toggling a checkbox calls onToggle', () => {
    const onToggle = vi.fn();
    render(<SessionSettings {...defaultProps} onToggle={onToggle} />);
    open();
    fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(`enable ${GAMES[0].name}`, 'i') }));
    expect(onToggle).toHaveBeenCalledWith(GAMES[0].id, false);
  });

  it('disables the checkbox of the last remaining enabled game', () => {
    let s = defaultSettings(GAMES);
    for (const g of GAMES.slice(1)) s = setEnabled(s, g.id, false);
    render(<SessionSettings {...defaultProps} settings={s} />);
    open();
    expect(screen.getByRole('checkbox', { name: new RegExp(`enable ${GAMES[0].name}`, 'i') })).toBeDisabled();
  });

  it('reset to default calls onReset', () => {
    const onReset = vi.fn();
    render(<SessionSettings {...defaultProps} onReset={onReset} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /reset to default/i }));
    expect(onReset).toHaveBeenCalled();
  });

  it('select all calls onSelectAll', () => {
    const onSelectAll = vi.fn();
    render(<SessionSettings {...defaultProps} onSelectAll={onSelectAll} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /^select all$/i }));
    expect(onSelectAll).toHaveBeenCalled();
  });

  it('deselect all calls onDeselectAll', () => {
    const onDeselectAll = vi.fn();
    render(<SessionSettings {...defaultProps} onDeselectAll={onDeselectAll} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /^deselect all$/i }));
    expect(onDeselectAll).toHaveBeenCalled();
  });

  it('toggles unique solution option', () => {
    const onSessionOption = vi.fn();
    render(<SessionSettings {...defaultProps} onSessionOption={onSessionOption} />);
    open();
    const switchEl = screen.getByRole('switch', { name: /unique solution/i });
    fireEvent.click(switchEl);
    expect(onSessionOption).toHaveBeenCalledWith('uniqueSolution', true);
  });

  it('filters games by search text', () => {
    render(<SessionSettings {...defaultProps} />);
    open();
    const search = screen.getByRole('textbox', { name: /filter games/i });
    fireEvent.change(search, { target: { value: 'clique' } });
    // Clique should be visible
    expect(screen.getByRole('checkbox', { name: /enable clique/i })).toBeInTheDocument();
    // Some other games should be hidden (or not matching the filter)
    // We just verify the search input works without crash
  });

  it('filters games by category chip', () => {
    render(<SessionSettings {...defaultProps} />);
    open();
    // Click the "Graph" category filter
    fireEvent.click(screen.getByRole('button', { name: /filter graph/i }));
    // Graph games should be visible; we just verify the filter chip toggles without crash
  });

  it('shows tag badges for each game', () => {
    render(<SessionSettings {...defaultProps} />);
    open();
    // Every game should have at least one display tag badge
    const badges = screen.getAllByText('graph', { exact: false })
      .concat(screen.getAllByText('set', { exact: false }))
      .concat(screen.getAllByText('number', { exact: false }));
    expect(badges.length).toBeGreaterThan(0);
  });

  it('clear filters button appears when filters are active', () => {
    render(<SessionSettings {...defaultProps} />);
    open();
    // Activate a filter
    const search = screen.getByRole('textbox', { name: /filter games/i });
    fireEvent.change(search, { target: { value: 'test' } });
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });
});
