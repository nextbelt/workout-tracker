import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { foodRouter } from './routes/food.js';
import { exercisesRouter } from './routes/exercises.js';
import { youtubeRouter } from './routes/youtube.js';
import { spotifyRouter } from './routes/spotify.js';

const app = express();
const PORT = process.env.PORT ?? 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:7000';

// Allow both production and localhost origins for CORS
const allowedOrigins = [
  FRONTEND_ORIGIN,
  'http://localhost:7000',
  'http://localhost:5173',
  'http://127.0.0.1:7000',
  'http://127.0.0.1:5173',
];

app.use(express.json());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PUT'],
  credentials: false,
}));

// Global rate limit: 100 req/min per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

app.use('/api/food', foodRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/youtube', youtubeRouter);
app.use('/api/spotify', spotifyRouter);

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'api-proxy', timestamp: new Date().toISOString() });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`API proxy listening on port ${PORT}`);
});
