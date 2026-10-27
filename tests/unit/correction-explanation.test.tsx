/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { CorrectionExplanation } from '@/components/ui/chat/message/CorrectionExplanation';
import { TranscriptMessageContent } from '@/components/ui/voice/transcript/TranscriptMessageContent';
import { corrected, languageConfig } from '../fixtures';

test('opens native-language notes and restores focus when closed', () => {
  render(
    <CorrectionExplanation
      issues={corrected.issues}
      language="fr"
    />,
  );
  const help = screen.getByRole('button', { name: 'Explain correction' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(help);
  const popup = screen.getByRole('dialog', { name: 'Correction' });
  expect(within(popup).getByRole('list')).toHaveAttribute('lang', 'fr');
  expect(within(popup).getByText(corrected.issues[0].explanation)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Close explanation' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(help).toHaveFocus();
});

test('Escape dismisses voice help without reaching the call controls', () => {
  const closeCall = jest.fn();
  const message = {
    id: 'one',
    role: 'user' as const,
    content: 'I has a apple.',
    timestamp: new Date(0),
    correction: corrected,
  };
  render(
    <div
      role="dialog"
      aria-label="Call"
      onKeyDown={closeCall}
    >
      <TranscriptMessageContent
        message={message}
        config={languageConfig}
      />
    </div>,
  );
  const help = screen.getByRole('button', { name: 'Explain correction' });
  fireEvent.click(help);
  const popup = screen.getByRole('dialog', { name: 'Correction' });
  expect(within(popup).getByRole('list')).toHaveAttribute('lang', 'fr');
  fireEvent.keyDown(screen.getByRole('button', { name: 'Close explanation' }), {
    key: 'Escape',
  });
  expect(screen.queryByRole('dialog', { name: 'Correction' })).not.toBeInTheDocument();
  expect(help).toHaveFocus();
  expect(closeCall).not.toHaveBeenCalled();
});

test('keeps one explanation open and dismisses it when focus moves to the draft', () => {
  render(
    <>
      <CorrectionExplanation
        issues={corrected.issues}
        language="fr"
      />
      <CorrectionExplanation
        issues={[{ category: 'spelling', explanation: 'Second correction.' }]}
        language="en"
      />
      <textarea aria-label="Draft" />
    </>,
  );
  const buttons = screen.getAllByRole('button', { name: 'Explain correction' });
  fireEvent.click(buttons[0]);
  act(() => buttons[1].focus());
  fireEvent.click(buttons[1]);
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  expect(screen.getByText('Second correction.')).toBeVisible();
  const draft = screen.getByRole('textbox', { name: 'Draft' });
  act(() => draft.focus());
  fireEvent.pointerDown(draft);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(draft).toHaveFocus();
});
