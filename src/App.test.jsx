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
});
