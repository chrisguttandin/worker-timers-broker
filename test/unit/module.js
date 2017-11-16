import { load } from '../../src/module';

describe('module', () => {

    let now;
    let workerTimers;

    afterEach(() => {
        performance.reset();

        Worker.reset();
    });

    beforeEach(() => {
        now = performance.now();

        performance = ((originalPerformance) => { // eslint-disable-line no-global-assign
            return {
                now: () => {
                    return now;
                },
                reset: () => {
                    performance = originalPerformance; // eslint-disable-line no-global-assign
                }
            };
        })(performance);

        Worker = ((OriginalWorker) => { // eslint-disable-line no-global-assign
            const instances = [];

            return class ExtendedWorker extends OriginalWorker {

                constructor (url) {
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

                static addEventListener (index, ...args) {
                    return instances[index].addEventListener(index, ...args);
                }

                static get instances () {
                    return instances;
                }

                static reset () {
                    Worker = OriginalWorker; // eslint-disable-line no-global-assign
                }

            };
        })(Worker);

        const blob = new Blob([
            `self.addEventListener('message', ({ data }) => {
                self.postMessage(data);
            });`
        ], { type: 'application/javascript' });

        workerTimers = load(URL.createObjectURL(blob));
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

        it('should send the correct scheduling message', function (done) {
            this.timeout(4000);

            Worker.addEventListener(0, 'message', ({ data }) => {
                try {
                    expect(data).to.deep.equal({
                        id: null,
                        method: 'set',
                        params: { delay, now, timerId: id, timerType: 'interval' }
                    });

                    done();
                } catch (err) {
                    // This might happen if we catch the first message as well.
                }

                done();
            });

            id = workerTimers.setInterval(() => {}, delay);
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

        it('should send the correct scheduling message', function (done) {
            this.timeout(4000);

            Worker.addEventListener(0, 'message', ({ data }) => {
                try {
                    expect(data).to.deep.equal({
                        id: null,
                        method: 'set',
                        params: { delay, now, timerId: id, timerType: 'timeout' }
                    });

                    done();
                } catch (err) {
                    // This might happen if we catch the first message as well.
                }

                done();
            });

            id = workerTimers.setTimeout(() => {}, delay);
        });

    });

});
