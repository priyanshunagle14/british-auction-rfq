import mongoose from 'mongoose';

export function validateBidInput(body = {}) {
    const errors = [];

    if (!mongoose.isValidObjectId(body.supplierId)) errors.push('supplierId is invalid');
    if (!body.carrierName || !String(body.carrierName).trim()) {
        errors.push('carrierName is required');
    }

    const charges = {};
    for (const f of ['freight', 'originCharges', 'destinationCharges']) {
        const n = Number(body[f]);
        if (body[f] === undefined || body[f] === '' || !Number.isFinite(n) || n < 0) {
            errors.push(`${f} must be a number >= 0`);
        }
        charges[f] = n;
    }

    const days = Number(body.transitDays);
    if (!Number.isInteger(days) || days < 1) {
        errors.push('transitDays must be a positive integer');
    }

    const validity = new Date(body.quoteValidity);
    if (!body.quoteValidity || isNaN(validity.getTime())) {
        errors.push('quoteValidity must be a valid date');
    } else if (validity <= new Date()) {
        errors.push('quoteValidity must be in the future');
    }

    if (errors.length) return { errors };

    const total = charges.freight + charges.originCharges + charges.destinationCharges;
    if (total <= 0) return { errors: ['total price must be greater than 0'] };

    return {
        errors,
        data: {
            supplierId: body.supplierId,
            carrierName: String(body.carrierName).trim(),
            ...charges,
            transitDays: days,
            quoteValidity: validity,
        },
    };
}