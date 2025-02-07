import { load } from '../../src/module';

describe('module', () => {
    let now;
    let timeOrigin;
    let workerTimers;

    afterEach(() => {
        performance.reset();

        Worker.reset();
    });

    beforeEach(() => {
        now = performance.now();
        timeOrigin = performance.timeOrigin;

        // eslint-disable-next-line no-global-assign
        performance = ((originalPerformance) => {
            return {
                now: () => {
                    return now;
                },
                reset: () => {
                    performance = originalPerformance; // eslint-disable-line no-global-assign
                },
                timeOrigin
            };
        })(performance);

        // eslint-disable-next-line no-global-assign
        Worker = ((OriginalWorker) => {
            const instances = [];

            return class ExtendedWorker extends OriginalWorker {
                constructor(url) {
                    super(url);

                    const addEventListener = this.addEventListener;

                    // This is an ugly hack to prevent the broker from handling mirrored events.
                    this.addEventListener = (index, ...args) => {
                        if (typeof index === 'number') {
                            return addEventListener.apply(this, args);
                        }
                    };

                    instances.push(this);
                }

                static addEventListener(index, ...args) {
                    return instances[index].addEventListener(index, ...args);
                }

                static get instances() {
                    return instances;
                }

                static reset() {
                    // eslint-disable-next-line no-global-assign
                    Worker = OriginalWorker;
                }
            };
        })(Worker);

        const blob = new Blob(
            [
                `self.addEventListener('message', ({ data }) => {
                self.postMessage(data);
            });`
            ],
            { type: 'application/javascript' }
        );
        const url = URL.createObjectURL(blob);

        workerTimers = load(url);

        URL.revokeObjectURL(url);
    });

    describe('clearInterval()', () => {
        let id;

        beforeEach(() => {
            id = workerTimers.setInterval(() => {}, 100);
        });

        it('should send the correct clearing message', (done) => {
            Worker.addEventListener(0, 'message', ({ data }) => {
                try {
                    expect(data.id).to.be.a('number');

                    expect(data).to.deep.equal({
                        id: data.id,
                        method: 'clear',
                        params: { timerId: id, timerType: 'interval' }
                    });

                    done();
                } catch (err) {
                    // This might happen if we catch the first message as well.
                }
            });

            workerTimers.clearInterval(id);
        });

        it('should send no message when attempting to clear an unscheduled interval', (done) => {
            Worker.addEventListener(0, 'message', ({ data }) => {
                if (data.method === 'clear') {
                    done(new Error('This should never be called.'));
                }
            });

            workerTimers.clearInterval(id + 1);

            setTimeout(done, 1000);
        });
    });

    describe('clearTimeout()', () => {
        let id;

        beforeEach(() => {
            id = workerTimers.setTimeout(() => {}, 100);
        });

        it('should send the correct clearing message', (done) => {
            Worker.addEventListener(0, 'message', ({ data }) => {
                try {
                    expect(data.id).to.be.a('number');

                    expect(data).to.deep.equal({
                        id: data.id,
                        method: 'clear',
                        params: { timerId: id, timerType: 'timeout' }
                    });

                    done();
                } catch (err) {
                    // This might happen if we catch the first message as well.
                }
            });

            workerTimers.clearTimeout(id);
        });

        it('should send no message when attempting to clear an unscheduled timeout', (done) => {
            Worker.addEventListener(0, 'message', ({ data }) => {
                if (data.method === 'clear') {
                    done(new Error('This should never be called.'));
                }
            });

            workerTimers.clearTimeout(id + 1);

            setTimeout(done, 1000);
        });
    });

    describe('setInterval()', () => {
        let delay;
        let id;

        afterEach(() => {
            workerTimers.clearInterval(id);
        });

        beforeEach(() => {
            delay = 100;
        });

        it('should return a numeric id', () => {
            id = workerTimers.setInterval(() => {}, 0);

            expect(id).to.be.a('number');
        });

        it('should return a value which is greater than zero', () => {
            id = workerTimers.setInterval(() => {}, 0);

            expect(id).to.be.above(0);
        });

        it('should send the correct scheduling message', function (done) {
            this.timeout(4000);

            Worker.addEventListener(0, 'message', ({ data }) => {
                try {
                    expect(data.id).to.be.a('number');

                    expect(data).to.deep.equal({
                        id: data.id,
                        method: 'set',
                        params: { delay, now: timeOrigin + now, timerId: id, timerType: 'interval' }
                    });

                    done();
                } catch (err) {
                    // This might happen if we catch the first message as well.
                }
            });

            id = workerTimers.setInterval(() => {}, delay);
        });

        it('should send the correct scheduling message when omitting the delay', function (done) {
            this.timeout(4000);

            Worker.addEventListener(0, 'message', ({ data }) => {
                try {
                    expect(data.id).to.be.a('number');

                    expect(data).to.deep.equal({
                        id: data.id,
                        method: 'set',
                        params: { delay: 0, now: timeOrigin + now, timerId: id, timerType: 'interval' }
                    });

                    done();
                } catch (err) {
                    // This might happen if we catch the first message as well.
                }
            });

            id = workerTimers.setInterval(() => {});
        });
    });

    describe('setTimeout()', () => {
        let delay;
        let id;

        afterEach(() => {
            workerTimers.clearTimeout(id);
        });

        beforeEach(() => {
            delay = 100;
        });

        it('should return a numeric id', () => {
            id = workerTimers.setTimeout(() => {}, 0);

            expect(id).to.be.a('number');
        });

        it('should return a value which is greater than zero', () => {
            id = workerTimers.setTimeout(() => {}, 0);

            expect(id).to.be.above(0);
        });

        it('should send the correct scheduling message', function (done) {
            this.timeout(4000);

            Worker.addEventListener(0, 'message', ({ data }) => {
                try {
                    expect(data.id).to.be.a('number');

                    expect(data).to.deep.equal({
                        id: data.id,
                        method: 'set',
                        params: { delay, now: timeOrigin + now, timerId: id, timerType: 'timeout' }
                    });

                    done();
                } catch (err) {
                    // This might happen if we catch the first message as well.
                }
            });

            id = workerTimers.setTimeout(() => {}, delay);
        });

        it('should send the correct scheduling message when omitting the delay', function (done) {
            this.timeout(4000);

            Worker.addEventListener(0, 'message', ({ data }) => {
                try {
                    expect(data.id).to.be.a('number');

                    expect(data).to.deep.equal({
                        id: data.id,
                        method: 'set',
                        params: { delay: 0, now: timeOrigin + now, timerId: id, timerType: 'timeout' }
                    });

                    done();
                } catch (err) {
                    // This might happen if we catch the first message as well.
                }
            });

            id = workerTimers.setTimeout(() => {});
        });
    });
});
