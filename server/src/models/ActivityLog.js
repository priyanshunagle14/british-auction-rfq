import mongoose from 'mongoose';
import { LOG_TYPES } from '../utils/constants.js';

const activityLogSchema = new mongoose.Schema(
    {
        rfqId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rfq', required: true },
        type: { type: String, enum: Object.values(LOG_TYPES), required: true },
        message: { type: String, required: true },
        oldCloseTime: Date,
        newCloseTime: Date,
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ rfqId: 1, createdAt: 1 });

export default mongoose.model('ActivityLog', activityLogSchema);