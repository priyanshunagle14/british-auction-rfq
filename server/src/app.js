import express from 'express';
import cors from 'cors';
import rfqRoutes from './routes/rfq.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import { HttpError } from './utils/HttpError.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('British Auction RFQ API is running. See /api/rfqs');
});
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/rfqs', rfqRoutes);
app.use('/api/suppliers', supplierRoutes);




app.use((err, req, res, next) => {
    if (err instanceof HttpError) {
        return res.status(err.status).json({ errors: [err.message] });
    }
    console.error(err);
    res.status(500).json({ errors: ['Internal server error'] });
});

export default app;