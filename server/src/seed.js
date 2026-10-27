import 'dotenv/config';
import mongoose from 'mongoose';
import Supplier from './models/Supplier.js';

await mongoose.connect(process.env.MONGO_URI);
await Supplier.deleteMany({});
await Supplier.insertMany([
    { name: 'Maersk Logistics' },
    { name: 'DHL Global Forwarding' },
    { name: 'Blue Dart Freight' },
]);
console.log('Seeded suppliers');
await mongoose.disconnect();