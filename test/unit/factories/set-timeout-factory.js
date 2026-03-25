import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSetTimeoutFactory } from '../../../src/factories/set-timeout-factory';

describe('setTimeout()', () => {
    let args;
    let callback;
    let delay;
    let generateUniqueNumber;
    let scheduledTimeoutsState;
    let set;
    let setTimeout;
    let timerId;

    beforeEach(() => {
        args = ['a', 'b', 'c'];
        callback = vi.fn();
        delay = Math.random() * 1000;
        generateUniqueNumber = vi.fn();
        set = vi.fn();
        scheduledTimeoutsState = new Map();
        timerId = Math.ceil(Math.random() * 1000);

        setTimeout = createSetTimeoutFactory(generateUniqueNumber, scheduledTimeoutsState)(set);

        generateUniqueNumber.mockReturnValue(timerId);
        set.mockResolvedValue(true);
    });

    it('should return the timerId', () => {
        expect(setTimeout(callback, delay, ...args)).to.equal(timerId);
    });

    it('should call generateUniqueNumber() with the given map', () => {
        setTimeout(callback, delay, ...args);

        expect(generateUniqueNumber).to.have.been.calledOnceWith(scheduledTimeoutsState);
    });

    it('should set the state to a symbol', () => {
        setTimeout(callback, delay, ...args);

        expect(scheduledTimeoutsState.get(timerId)).to.be.a('symbol');
    });

    it('should call set() with the given delay', () => {
        setTimeout(callback, delay, ...args);

        expect(set).to.have.been.calledOnceWith(delay, timerId);
    });

    describe('without changing the state for the given timerId', () => {
        beforeEach(() => {
            setTimeout(callback, delay, ...args);
        });

        it('should delete the state for the given timerId', async () => {
            await Promise.resolve();

            expect(scheduledTimeoutsState.get(timerId)).to.be.undefined;
        });

        it('should call the callback function with the given arguments', async () => {
            await Promise.resolve();

            expect(callback).to.have.been.calledOnceWith(...args);
        });
    });

    describe('with the state for the given timerId set to null', () => {
        beforeEach(() => {
            setTimeout(callback, delay, ...args);

            scheduledTimeoutsState.set(timerId, null);
        });

        it('should not change the state for the given timerId', async () => {
            await Promise.resolve();

            expect(scheduledTimeoutsState.get(timerId)).to.be.null;
        });

        it('should not call the callback', async () => {
            await Promise.resolve();

            expect(callback).to.have.not.been.called;
        });
    });

    describe('without the state for the given timerId', () => {
        let listener;

        afterEach(async () => {
            await new Promise((resolve) => {
                window.setTimeout(() => {
                    window.removeEventListener('unhandledrejection', listener, true);
                    resolve();
                });
            });
        });

        beforeEach(() => {
            const { promise, resolve } = Promise.withResolvers();

            listener = (event) => {
                event.preventDefault();

                expect(event.reason.message).to.equal('The timer is in an undefined state.');

                resolve();
            };

            window.addEventListener('unhandledrejection', listener, true);

            setTimeout(callback, delay, ...args);

            scheduledTimeoutsState.delete(timerId);

            return promise;
        });

        it('should not change the state for the given timerId', () => {
            expect(scheduledTimeoutsState.get(timerId)).to.be.undefined;
        });

        it('should not call the callback', () => {
            expect(callback).to.have.not.been.called;
        });
    });
});
