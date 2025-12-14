import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSetIntervalFactory } from '../../../src/factories/set-interval-factory';
import { stub } from 'sinon';

describe('setInterval()', () => {
    let args;
    let callback;
    let delay;
    let generateUniqueNumber;
    let scheduledIntervalsState;
    let set;
    let setInterval;
    let timerId;

    beforeEach(() => {
        args = ['a', 'b', 'c'];
        callback = stub();
        delay = Math.random() * 1000;
        generateUniqueNumber = stub();
        set = stub();
        scheduledIntervalsState = new Map();
        timerId = Math.ceil(Math.random() * 1000);

        setInterval = createSetIntervalFactory(generateUniqueNumber, scheduledIntervalsState)(set);

        generateUniqueNumber.returns(timerId);
        set.onFirstCall().resolves(true);
        set.onSecondCall().returns(new Promise(() => {}));
    });

    it('should return the timerId', () => {
        expect(setInterval(callback, delay, ...args)).to.equal(timerId);
    });

    it('should call generateUniqueNumber() with the given map', () => {
        setInterval(callback, delay, ...args);

        expect(generateUniqueNumber).to.have.been.calledOnceWithExactly(scheduledIntervalsState);
    });

    it('should set the state to a symbol', () => {
        setInterval(callback, delay, ...args);

        expect(scheduledIntervalsState.get(timerId)).to.be.a('symbol');
    });

    it('should call set() with the given delay', () => {
        setInterval(callback, delay, ...args);

        expect(set).to.have.been.calledOnceWithExactly(delay, timerId);
    });

    describe('without changing the state for the given timerId', () => {
        let promise;
        let resolve;

        beforeEach(() => {
            ({ promise, resolve } = Promise.withResolvers());

            set.onFirstCall().resolves(promise);

            setInterval(callback, delay, ...args);
        });

        it('should not change the state for the given timerId', async () => {
            resolve();

            await promise;

            expect(scheduledIntervalsState.get(timerId)).to.be.a('symbol');
        });

        it('should call the callback function with the given arguments', async () => {
            resolve();

            await promise;

            expect(callback).to.have.been.calledOnceWithExactly(...args);
        });

        describe("with a callback function that doesn't change the state for the given timerId", () => {
            beforeEach(async () => {
                resolve();

                set.onFirstCall().returns(new Promise(() => {}));
                set.resetHistory();

                await promise;
            });

            it('should call set() with the given delay', async () => {
                await Promise.resolve();

                expect(set).to.have.been.calledOnceWithExactly(delay, timerId);
            });
        });

        describe('with a callback function that sets the state for the given timerId set to null', () => {
            beforeEach(async () => {
                callback.callsFake(() => {
                    scheduledIntervalsState.set(timerId, null);
                });

                resolve();

                set.resetHistory();

                await promise;
            });

            it('should not call set()', async () => {
                await Promise.resolve();

                expect(set).to.have.not.been.called;
            });
        });

        describe('with a callback function that deletes the state for the given timerId', () => {
            beforeEach(async () => {
                callback.callsFake(() => {
                    scheduledIntervalsState.delete(timerId);
                });

                resolve();

                set.resetHistory();

                await promise;
            });

            it('should not call set()', async () => {
                await Promise.resolve();

                expect(set).to.have.not.been.called;
            });
        });
    });

    describe('with the state for the given timerId set to null', () => {
        beforeEach(() => {
            setInterval(callback, delay, ...args);

            scheduledIntervalsState.set(timerId, null);
        });

        it('should not change the state for the given timerId', async () => {
            await Promise.resolve();

            expect(scheduledIntervalsState.get(timerId)).to.be.null;
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

            setInterval(callback, delay, ...args);

            scheduledIntervalsState.delete(timerId);

            return promise;
        });

        it('should not change the state for the given timerId', () => {
            expect(scheduledIntervalsState.get(timerId)).to.be.undefined;
        });

        it('should not call the callback', () => {
            expect(callback).to.have.not.been.called;
        });
    });
});
