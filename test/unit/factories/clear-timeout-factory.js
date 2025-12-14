import { beforeEach, describe, expect, it } from 'vitest';
import { createClearTimeoutFactory } from '../../../src/factories/clear-timeout-factory';
import { stub } from 'sinon';

describe('clearTimeout()', () => {
    let clear;
    let clearTimeout;
    let scheduledTimeoutsState;
    let timerId;

    beforeEach(() => {
        clear = stub();
        scheduledTimeoutsState = new Map();
        timerId = Math.ceil(Math.random() * 1000);

        clearTimeout = createClearTimeoutFactory(scheduledTimeoutsState)(clear);

        clear.resolves(true);
    });

    describe('without a state for the given timerId', () => {
        it('should return undefined', () => {
            expect(clearTimeout(timerId)).to.be.undefined;
        });

        it('should not set any state for the given timerId', () => {
            clearTimeout(timerId);

            expect(scheduledTimeoutsState.get(timerId)).to.be.undefined;
        });

        it('should not call clear()', () => {
            clearTimeout(timerId);

            expect(clear).to.have.not.been.called;
        });
    });

    describe('with null as the state for the given timerId', () => {
        beforeEach(() => {
            scheduledTimeoutsState.set(timerId, null);
        });

        it('should return undefined', () => {
            expect(clearTimeout(timerId)).to.be.undefined;
        });

        it('should not change the state for the given timerId', () => {
            clearTimeout(timerId);

            expect(scheduledTimeoutsState.get(timerId)).to.be.null;
        });

        it('should not call clear()', () => {
            clearTimeout(timerId);

            expect(clear).to.have.not.been.called;
        });
    });

    describe('with a symbol as the state for the given timerId', () => {
        beforeEach(() => {
            scheduledTimeoutsState.set(timerId, Symbol('a fake state value'));
        });

        it('should return undefined', () => {
            expect(clearTimeout(timerId)).to.be.undefined;
        });

        it('should set the state for the given timerId to null', () => {
            clearTimeout(timerId);

            expect(scheduledTimeoutsState.get(timerId)).to.be.null;
        });

        it('should call clear() with the given timerId', () => {
            clearTimeout(timerId);

            expect(clear).to.have.been.calledOnceWithExactly(timerId);
        });

        describe('after the promise returned by clear() resolved', () => {
            beforeEach(async () => {
                clearTimeout(timerId);

                await Promise.resolve();
            });

            it('should delete the state for the given timerId', () => {
                expect(scheduledTimeoutsState.get(timerId)).to.be.undefined;
            });
        });
    });
});
