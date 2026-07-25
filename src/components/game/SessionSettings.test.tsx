import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionSettings } from './SessionSettings';
import { GAMES } from '@/games/registry';
import { defaultSettings, setEnabled, defaultSessionOptions } from '@/games/settings';

const open = () => fireEvent.click(screen.getByRole('button', { name: /advanced options/i }));

describe('SessionSettings', () => {
  it('renders a row per registered game', () => {
    render(
      <SessionSettings 
        settings={defaultSettings(GAMES)} 
        onToggle={() => {}} 
        onDifficulty={() => {}} 
        onReset={() => {}} 
        sessionOptions={defaultSessionOptions()}
        onSessionOption={() => {}} 
      />,
    );
    open();
    for (const g of GAMES) {
      expect(screen.getByRole('checkbox', { name: new RegExp(`enable ${g.name}`, 'i') })).toBeInTheDocument();
    }
  });

  it('toggling a checkbox calls onToggle', () => {
    const onToggle = vi.fn();
    render(
      <SessionSettings 
        settings={defaultSettings(GAMES)} 
        onToggle={onToggle} 
        onDifficulty={() => {}} 
        onReset={() => {}} 
        sessionOptions={defaultSessionOptions()}
        onSessionOption={() => {}} 
      />,
    );
    open();
    fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(`enable ${GAMES[0].name}`, 'i') }));
    expect(onToggle).toHaveBeenCalledWith(GAMES[0].id, false);
  });

  it('disables the checkbox of the last remaining enabled game', () => {
    // Disable all but the first game.
    let s = defaultSettings(GAMES);
    for (const g of GAMES.slice(1)) s = setEnabled(s, g.id, false);
    render(<SessionSettings 
      settings={s} 
      onToggle={() => {}} 
      onDifficulty={() => {}} 
      onReset={() => {}} 
      sessionOptions={defaultSessionOptions()}
      onSessionOption={() => {}} 
    />);
    open();
    expect(screen.getByRole('checkbox', { name: new RegExp(`enable ${GAMES[0].name}`, 'i') })).toBeDisabled();
  });

  it('reset calls onReset', () => {
    const onReset = vi.fn();
    render(
      <SessionSettings 
        settings={defaultSettings(GAMES)} 
        onToggle={() => {}} 
        onDifficulty={() => {}} 
        onReset={onReset} 
        sessionOptions={defaultSessionOptions()}
        onSessionOption={() => {}} 
      />,
    );
    open();
    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));
    expect(onReset).toHaveBeenCalled();
  });

  it('toggles unique solution option', () => {
    const onSessionOption = vi.fn();
    render(
      <SessionSettings 
        settings={defaultSettings(GAMES)} 
        onToggle={() => {}} 
        onDifficulty={() => {}} 
        onReset={() => {}} 
        sessionOptions={defaultSessionOptions()}
        onSessionOption={onSessionOption} 
      />,
    );
    open();
    const switchEl = screen.getByRole('switch', { name: /unique solution/i });
    fireEvent.click(switchEl);
    expect(onSessionOption).toHaveBeenCalledWith('uniqueSolution', true);
  });
});
