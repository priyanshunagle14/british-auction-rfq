import { EXTENSION_TRIGGERS } from './constants.js';

const REQUIRED = [
    'referenceId', 'name', 'bidStartTime', 'bidCloseTime', 'forcedCloseTime',
    'pickupDate', 'triggerWindowMinutes', 'extensionMinutes', 'extensionTrigger',
];

export function validateRfqInput(body = {}) {
    const errors = [];

    for (const field of REQUIRED) {
        if (body[field] === undefined || body[field] === null || body[field] === '') {
            errors.push(`${field} is required`);
        }
    }
    if (errors.length) return { errors };

    const dates = {};
    for (const f of ['bidStartTime', 'bidCloseTime', 'forcedCloseTime', 'pickupDate']) {
        const d = new Date(body[f]);
        if (isNaN(d.getTime())) errors.push(`${f} is not a valid date`);
        dates[f] = d;
    }

    const x = Number(body.triggerWindowMinutes);
    const y = Number(body.extensionMinutes);
    if (!Number.isInteger(x) || x < 1) errors.push('triggerWindowMinutes must be a positive integer');
    if (!Number.isInteger(y) || y < 1) errors.push('extensionMinutes must be a positive integer');

    if (!Object.values(EXTENSION_TRIGGERS).includes(body.extensionTrigger)) {
        errors.push(`extensionTrigger must be one of: ${Object.values(EXTENSION_TRIGGERS).join(', ')}`);
    }

    if (!errors.length) {
        if (dates.bidCloseTime <= dates.bidStartTime) {
            errors.push('bidCloseTime must be after bidStartTime');
        }
        if (dates.forcedCloseTime <= dates.bidCloseTime) {
            errors.push('forcedCloseTime must be later than bidCloseTime');
        }
    }

    if (errors.length) return { errors };

    return {
        errors,
        data: {
            referenceId: String(body.referenceId).trim(),
            name: String(body.name).trim(),
            bidStartTime: dates.bidStartTime,
            bidCloseTime: dates.bidCloseTime,
            forcedCloseTime: dates.forcedCloseTime,
            pickupDate: dates.pickupDate,
            triggerWindowMinutes: x,
            extensionMinutes: y,
            extensionTrigger: body.extensionTrigger,
        },
    };
}