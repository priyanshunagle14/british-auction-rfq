import mongoose from 'mongoose';
import { EXTENSION_TRIGGERS } from '../utils/constants.js';

const rfqSchema = new mongoose.Schema(
    {
        referenceId: { type: String, required: true, unique: true, trim: true },
        name: { type: String, required: true, trim: true },
        bidStartTime: { type: Date, required: true },
        bidCloseTime: {
            type: Date,
            required: true,
            validate: {
                validator(v) { return v > this.bidStartTime; },
                message: 'Bid close time must be after bid start time',
            },
        },
        currentCloseTime: { type: Date, required: true },
        forcedCloseTime: {
            type: Date,
            required: true,
            validate: {
                validator(v) { return v > this.bidCloseTime; },
                message: 'Forced close time must be later than bid close time',
            },
        },
        pickupDate: { type: Date, required: true },
        triggerWindowMinutes: { type: Number, required: true, min: 1 }, // X
        extensionMinutes: { type: Number, required: true, min: 1 },     // Y
        extensionTrigger: {
            type: String,
            enum: Object.values(EXTENSION_TRIGGERS),
            required: true,
        },
        lockToken: { type: String, default: null },
        lockExpiresAt: { type: Date, default: null },
    },
    { timestamps: true }
);

export default mongoose.model('Rfq', rfqSchema);