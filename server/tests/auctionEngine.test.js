import test from 'node:test';
import assert from 'node:assert/strict';
import {
    rankBids, isBiddingOpen, isInTriggerWindow,
    didRankChange, didL1Change, computeNewCloseTime, evaluateExtension,
} from '../src/services/auctionEngine.js';

const t = (hhmm, sec = '00') => new Date(`2026-10-26T${hhmm}:${sec}Z`);
const rk = (...ids) =>
    ids.map((id, i) => ({ supplierId: id, totalPrice: 100 + i, rank: i + 1 }));

const baseRfq = (over = {}) => ({
    bidStartTime: t('10:00'),
    currentCloseTime: t('18:00'),
    forcedCloseTime: t('18:30'),
    triggerWindowMinutes: 10,
    extensionMinutes: 5,
    extensionTrigger: 'ANY_BID',
    ...over,
});

test('rankBids sorts by price, ties go to the earlier bid', () => {
    const ranked = rankBids([
        { supplierId: 'A', totalPrice: 200, createdAt: t('10:00') },
        { supplierId: 'B', totalPrice: 150, createdAt: t('10:05') },
        { supplierId: 'C', totalPrice: 150, createdAt: t('10:01') },
    ]);
    assert.deepEqual(ranked.map((r) => r.supplierId), ['C', 'B', 'A']);
    assert.deepEqual(ranked.map((r) => r.rank), [1, 2, 3]);
});

test('isBiddingOpen: before start, open, exactly at close, after close', () => {
    const rfq = baseRfq();
    assert.equal(isBiddingOpen(t('09:59'), rfq).open, false);
    assert.equal(isBiddingOpen(t('12:00'), rfq).open, true);
    assert.equal(isBiddingOpen(t('18:00'), rfq).open, false);
    assert.equal(isBiddingOpen(t('18:01'), rfq).open, false);
});

test('trigger window is [close - X, close)', () => {
    assert.equal(isInTriggerWindow(t('17:49', '59'), t('18:00'), 10), false);
    assert.equal(isInTriggerWindow(t('17:50'), t('18:00'), 10), true);
    assert.equal(isInTriggerWindow(t('18:00'), t('18:00'), 10), false);
});

test('rank change: swap counts, new supplier at the bottom does not, new supplier on top does', () => {
    assert.equal(didRankChange(rk('A', 'B'), rk('B', 'A')), true);
    assert.equal(didRankChange(rk('A', 'B'), rk('A', 'B', 'C')), false);
    assert.equal(didRankChange(rk('A', 'B'), rk('C', 'A', 'B')), true);
    assert.equal(didRankChange([], rk('A')), true);
});

test('L1 change only when rank 1 supplier changes', () => {
    assert.equal(didL1Change(rk('A', 'B', 'C'), rk('A', 'C', 'B')), false);
    assert.equal(didL1Change(rk('A', 'B'), rk('B', 'A')), true);
    assert.equal(didL1Change([], rk('A')), true);
});

test('computeNewCloseTime adds Y minutes', () => {
    const r = computeNewCloseTime(t('18:00'), 5, t('18:30'));
    assert.equal(r.newCloseTime.toISOString(), t('18:05').toISOString());
    assert.equal(r.capped, false);
});

test('ANY_BID: bid outside window does not extend', () => {
    const r = evaluateExtension({
        now: t('17:49'), rfq: baseRfq(), ranksBefore: rk('A'), ranksAfter: rk('A', 'B'),
    });
    assert.equal(r.extend, false);
});

test('ANY_BID: bid inside window extends from current close time', () => {
    const r = evaluateExtension({
        now: t('17:55'), rfq: baseRfq(), ranksBefore: rk('A'), ranksAfter: rk('A', 'B'),
    });
    assert.equal(r.extend, true);
    assert.equal(r.newCloseTime.toISOString(), t('18:05').toISOString());
});

test('ANY_RANK_CHANGE: extends on swap, not when ranks are unchanged', () => {
    const rfq = baseRfq({ extensionTrigger: 'ANY_RANK_CHANGE' });
    const swap = evaluateExtension({
        now: t('17:58'), rfq, ranksBefore: rk('A', 'B'), ranksAfter: rk('B', 'A'),
    });
    const same = evaluateExtension({
        now: t('17:58'), rfq, ranksBefore: rk('A', 'B'), ranksAfter: rk('A', 'B', 'C'),
    });
    assert.equal(swap.extend, true);
    assert.equal(same.extend, false);
});

test('L1_CHANGE: lower-rank shuffle does not extend, new L1 does', () => {
    const rfq = baseRfq({ extensionTrigger: 'L1_CHANGE' });
    const shuffle = evaluateExtension({
        now: t('17:59'), rfq, ranksBefore: rk('A', 'B', 'C'), ranksAfter: rk('A', 'C', 'B'),
    });
    const newL1 = evaluateExtension({
        now: t('17:59'), rfq, ranksBefore: rk('A', 'B', 'C'), ranksAfter: rk('C', 'A', 'B'),
    });
    assert.equal(shuffle.extend, false);
    assert.equal(newL1.extend, true);
});

test('extension is capped at the forced close time', () => {
    const rfq = baseRfq({ currentCloseTime: t('18:28') });
    const r = evaluateExtension({
        now: t('18:25'), rfq, ranksBefore: rk('A'), ranksAfter: rk('A', 'B'),
    });
    assert.equal(r.extend, true);
    assert.equal(r.capped, true);
    assert.equal(r.newCloseTime.toISOString(), t('18:30').toISOString());
});

test('already at forced close: trigger fires but no further extension', () => {
    const rfq = baseRfq({ currentCloseTime: t('18:30') });
    const r = evaluateExtension({
        now: t('18:25'), rfq, ranksBefore: rk('A'), ranksAfter: rk('A', 'B'),
    });
    assert.equal(r.extend, false);
    assert.equal(r.capped, true);
});