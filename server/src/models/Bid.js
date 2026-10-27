import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema(
    {
        rfqId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rfq', required: true },
        supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
        carrierName: { type: String, required: true, trim: true },
        freight: { type: Number, required: true, min: 0 },
        originCharges: { type: Number, required: true, min: 0 },
        destinationCharges: { type: Number, required: true, min: 0 },
        totalPrice: { type: Number },
        transitDays: { type: Number, required: true, min: 1 },
        quoteValidity: { type: Date, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

bidSchema.pre('validate', function () {
    this.totalPrice = this.freight + this.originCharges + this.destinationCharges;
});

bidSchema.index({ rfqId: 1, supplierId: 1, createdAt: -1 });
bidSchema.index({ rfqId: 1, totalPrice: 1 });

export default mongoose.model('Bid', bidSchema);