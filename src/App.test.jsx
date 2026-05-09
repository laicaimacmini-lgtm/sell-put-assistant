import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the Sell Put Assistant dashboard title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /sell put assistant/i })).toBeInTheDocument();
  });

  it('shows the default SMH example', () => {
    render(<App />);
    expect(screen.getByLabelText(/ticker/i)).toHaveDisplayValue('SMH');
    expect(screen.getByLabelText(/current price/i)).toHaveDisplayValue('255');
  });

  it('shows Not Enough Cash after reducing available cash', async () => {
    const user = userEvent.setup();
    render(<App />);

    const cashInput = screen.getByLabelText(/account cash available/i);
    await user.clear(cashInput);
    await user.type(cashInput, '10000');

    expect(screen.getAllByText(/not enough cash/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/cash requirement exceeds available cash/i).length).toBeGreaterThan(0);
  });

  it('shows aggressive risk language after increasing delta', async () => {
    const user = userEvent.setup();
    render(<App />);

    const deltaInput = screen.getByLabelText(/^delta$/i);
    await user.clear(deltaInput);
    await user.type(deltaInput, '0.42');

    expect(screen.getAllByText(/aggressive|higher risk/i).length).toBeGreaterThan(0);
  });

  it('includes the education-only disclaimer', () => {
    render(<App />);
    expect(screen.getByText(/not financial advice/i)).toBeInTheDocument();
  });

  it('renders the strike comparison table with three default candidates', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /compare put strikes/i })).toBeInTheDocument();
    expect(screen.getAllByTestId('comparison-row')).toHaveLength(3);
  });

  it('adds a row and resets back to the three examples', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /add row/i }));
    expect(screen.getAllByTestId('comparison-row')).toHaveLength(4);

    await user.click(screen.getByRole('button', { name: /reset examples/i }));
    expect(screen.getAllByTestId('comparison-row')).toHaveLength(3);
  });

  it('shows balanced setup guidance in the comparison area', () => {
    render(<App />);
    expect(screen.getAllByText(/best balanced setup|no perfect setup/i).length).toBeGreaterThan(0);
  });

  it('updates comparison risk flags when available cash is reduced', async () => {
    const user = userEvent.setup();
    render(<App />);

    const cashInput = screen.getByLabelText(/account cash available/i);
    await user.clear(cashInput);
    await user.type(cashInput, '10000');

    expect(screen.getAllByText(/not enough cash/i).length).toBeGreaterThan(0);
  });
});
