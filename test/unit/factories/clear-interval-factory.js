import { beforeEach, describe, expect, it } from 'vitest';
import { createClearIntervalFactory } from '../../../src/factories/clear-interval-factory';
import { stub } from 'sinon';

describe('clearInterval()', () => {
    let clear;
    let clearInterval;
    let scheduledIntervalsState;
    let timerId;

    beforeEach(() => {
        clear = stub();
        scheduledIntervalsState = new Map();
        timerId = Math.ceil(Math.random() * 1000);

        clearInterval = createClearIntervalFactory(scheduledIntervalsState)(clear);

        clear.resolves(true);
    });

    describe('without a state for the given timerId', () => {
        it('should return undefined', () => {
            expect(clearInterval(timerId)).to.be.undefined;
        });

        it('should not set any state for the given timerId', () => {
            clearInterval(timerId);

            expect(scheduledIntervalsState.get(timerId)).to.be.undefined;
        });

        it('should not call clear()', () => {
            clearInterval(timerId);

            expect(clear).to.have.not.been.called;
        });
    });

    describe('with null as the state for the given timerId', () => {
        beforeEach(() => {
            scheduledIntervalsState.set(timerId, null);
        });

        it('should return undefined', () => {
            expect(clearInterval(timerId)).to.be.undefined;
        });

        it('should not change the state for the given timerId', () => {
            clearInterval(timerId);

            expect(scheduledIntervalsState.get(timerId)).to.be.null;
        });

        it('should not call clear()', () => {
            clearInterval(timerId);

            expect(clear).to.have.not.been.called;
        });
    });

    describe('with a symbol as the state for the given timerId', () => {
        beforeEach(() => {
            scheduledIntervalsState.set(timerId, Symbol('a fake state value'));
        });

        it('should return undefined', () => {
            expect(clearInterval(timerId)).to.be.undefined;
        });

        it('should set the state for the given timerId to null', () => {
            clearInterval(timerId);

            expect(scheduledIntervalsState.get(timerId)).to.be.null;
        });

        it('should call clear() with the given timerId', () => {
            clearInterval(timerId);

            expect(clear).to.have.been.calledOnceWithExactly(timerId);
        });

        describe('after the promise returned by clear() resolved', () => {
            beforeEach(async () => {
                clearInterval(timerId);

                await Promise.resolve();
            });

            it('should delete the state for the given timerId', () => {
                expect(scheduledIntervalsState.get(timerId)).to.be.undefined;
            });
        });
    });
});
