/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import Page from '@/app/page';
import { send } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  send: jest.fn(),
  translateMessage: jest.fn(),
}));

jest.mock('@/lib/voice/recognition', () => ({
  canRecord: jest.fn().mockReturnValue(false),
  RecordedRecognition: jest.fn(),
}));

test('formats AI emphasis while keeping user text, line breaks, and HTML literal', async () => {
  localStorage.clear();
  localStorage.setItem('langbot-native', 'fr');
  localStorage.setItem('langbot-target', 'en');
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  jest.mocked(send).mockResolvedValue({
    success: true,
    reply: 'Try **apples**, *pears*, and ***oranges***.\n<img src=x> **unfinished',
    correction: null,
  });
  const { container } = render(<Page />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Your message' }), {
    target: { value: '**My example**' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  expect((await screen.findByText('apples')).tagName).toBe('STRONG');
  expect(screen.getByText('pears').tagName).toBe('EM');
  expect(screen.getByText('oranges').closest('strong')).toBeInTheDocument();
  expect(screen.getByText('oranges').tagName).toBe('EM');
  const reply = container.querySelector('.message-assistant');
  expect(reply?.textContent).toContain(
    'Try apples, pears, and oranges.\n<img src=x> **unfinished',
  );
  expect(reply?.querySelector('img')).not.toBeInTheDocument();
  expect(screen.getByText('**My example**')).toBeInTheDocument();
  expect(container.querySelector('.message-user strong')).not.toBeInTheDocument();
});
