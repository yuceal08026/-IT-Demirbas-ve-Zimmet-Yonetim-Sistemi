import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { config } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requireJsonBody } from './middleware/auth.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import departmentsRouter from './routes/departments.js';

export function createApp() {
  const app = express();

  // nginx arkasında çalışırken gerçek istemci IP'si (rate limit için) X-Forwarded-For'dan alınır.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // İstek logu: yalnızca metot, yol, durum ve süre. Gövde, Cookie ve Authorization asla loglanmaz.
  if (!config.isTest) {
    app.use(morgan(':method :url :status :response-time ms'));
  }

  app.use('/health', healthRouter);

  app.use('/api', requireJsonBody);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/departments', departmentsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
