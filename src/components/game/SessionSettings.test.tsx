import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionSettings } from './SessionSettings';
import { GAMES } from '@/games/registry';
import { defaultSettings, defaultSessionOptions, setEnabled } from '@/games/settings';

const open = () => fireEvent.click(screen.getByRole('button', { name: /advanced options/i }));
const baseProps = {
  sessionOptions: defaultSessionOptions(),
  onSessionOption: () => {},
} as const;

describe('SessionSettings', () => {
  it('renders a row per registered game', () => {
    render(
      <SessionSettings {...baseProps} settings={defaultSettings(GAMES)} onToggle={() => {}} onDifficulty={() => {}} onReset={() => {}} />,
    );
    open();
    for (const g of GAMES) {
      expect(screen.getByRole('checkbox', { name: new RegExp(`enable ${g.name}`, 'i') })).toBeInTheDocument();
    }
  });

  it('toggling a checkbox calls onToggle', () => {
    const onToggle = vi.fn();
    render(
      <SessionSettings {...baseProps} settings={defaultSettings(GAMES)} onToggle={onToggle} onDifficulty={() => {}} onReset={() => {}} />,
    );
    open();
    fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(`enable ${GAMES[0].name}`, 'i') }));
    expect(onToggle).toHaveBeenCalledWith(GAMES[0].id, false);
  });

  it('disables the checkbox of the last remaining enabled game', () => {
    let s = defaultSettings(GAMES);
    for (const g of GAMES.slice(1)) s = setEnabled(s, g.id, false);
    render(<SessionSettings {...baseProps} settings={s} onToggle={() => {}} onDifficulty={() => {}} onReset={() => {}} />);
    open();
    expect(screen.getByRole('checkbox', { name: new RegExp(`enable ${GAMES[0].name}`, 'i') })).toBeDisabled();
  });

  it('reset calls onReset', () => {
    const onReset = vi.fn();
    render(
      <SessionSettings {...baseProps} settings={defaultSettings(GAMES)} onToggle={() => {}} onDifficulty={() => {}} onReset={onReset} />,
    );
    open();
    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));
    expect(onReset).toHaveBeenCalled();
  });
});
