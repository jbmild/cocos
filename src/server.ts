import 'reflect-metadata';
import dotenv from 'dotenv';

// Cargar variables de entorno ANTES de importar otros módulos
dotenv.config();

import express from 'express';
import cors from 'cors';
import { AppDataSource } from './config/database';
import instrumentRoutes from './routes/instrumentRoutes';
import portfolioRoutes from './routes/portfolioRoutes';
import orderRoutes from './routes/orderRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// API Routes
app.use('/instruments', instrumentRoutes);
app.use('/portfolio', portfolioRoutes);
app.use('/orders', orderRoutes);

// Initialize database connection
AppDataSource.initialize()
  .then(() => {
    console.log('Database connection established');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error during database initialization:', error);
    process.exit(1);
  });

export default app;
