import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { fetchOptionsChain, fetchOptionsExpirations, OptionsProviderError } from './optionsProvider.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, provider: process.env.OPTIONS_DATA_PROVIDER || 'mock' });
});

app.get('/api/options-chain', async (req, res) => {
  try {
    const result = await fetchOptionsChain({
      ticker: req.query.ticker,
      expiration: req.query.expiration,
      provider: req.query.provider,
    });
    res.json(result);
  } catch (error) {
    const status = error instanceof OptionsProviderError ? error.status : 500;
    res.status(status).json({
      error: error.message || 'Unknown options provider error',
      source: process.env.OPTIONS_DATA_PROVIDER || 'mock',
    });
  }
});


app.get("/api/options-expirations", async (req, res) => {
  try {
    const result = await fetchOptionsExpirations({
      ticker: req.query.ticker,
      provider: req.query.provider,
    });
    res.json(result);
  } catch (error) {
    const status = error instanceof OptionsProviderError ? error.status : 500;
    res.status(status).json({
      error: error.message || "Unknown options expiration provider error",
      source: req.query.provider || process.env.OPTIONS_DATA_PROVIDER || "mock",
    });
  }
});

app.listen(port, () => {
  console.log(`Options proxy listening on http://localhost:${port}`);
});
