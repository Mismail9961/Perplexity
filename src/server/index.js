import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import authRoutes from '../routes/auth.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  if (req.body !== undefined) return next();

  const contentType = req.headers['content-type'] || '';
  if (
    !contentType ||
    contentType.includes('text') ||
    contentType.includes('json')
  ) {
    let rawData = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      rawData += chunk;
    }); 
    req.on('end', () => {
      if (rawData.length === 0) return next();
      try {
        req.body = JSON.parse(rawData);
      } catch {
        req.body = rawData;
      }
      next();
    });
    req.on('error', next);
  } else {
    next();
  }
});
app.use(cookieParser());
app.use(cors());
app.use(
  morgan('combined')
);

app.get('/', (req, res) => {
  console.log('Received a request to the root endpoint');
  res.status(200).send('Hello for Perplexity API');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Perplexity API' });
});

app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes); // Uncomment when user routes exist

app.use((req, res) => {
  res.status(404).json({ error: 'Router not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;