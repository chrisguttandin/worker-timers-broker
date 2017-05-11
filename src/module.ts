import { IClearRequest, ISetNotification, IWorkerTimersWorkerEvent, TTimerType } from 'worker-timers-worker';
import { isCallNotification } from './guards/call-notification';

const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || Math.pow(2, 53) - 1;

const generateUniqueId = (map: Map<number, any>) => {
    let id = Math.round(Math.random() * MAX_SAFE_INTEGER);

    while (map.has(id)) {
        id = Math.round(Math.random() * MAX_SAFE_INTEGER);
    }

    return id;
};

export const load = (url: string) => {
    const scheduledIntervalFunctions: Map<number, number | Function> = new Map();
    const scheduledTimeoutFunctions: Map<number, number | Function> = new Map();
    const unrespondedRequests: Map<number, { timerId: number, timerType: TTimerType }> = new Map();

    const worker = new Worker(url);

    worker.addEventListener('message', ({ data }: IWorkerTimersWorkerEvent) => {
        if (isCallNotification(data)) {
            const { params: { timerId, timerType } } = data;

            if (timerType === 'interval') {
                const numberOrFunc = scheduledIntervalFunctions.get(timerId);

                if (typeof numberOrFunc === 'number') {
                    const timerIdAndTimerType = unrespondedRequests.get(numberOrFunc);

                    if (timerIdAndTimerType === undefined
                            || timerIdAndTimerType.timerId !== timerId
                            || timerIdAndTimerType.timerType !== timerType) {
                        throw new Error('The timer is in an undefined state.');
                    }
                } else {
                    numberOrFunc();
                }

            } else if (timerType === 'timeout') {
                const numberOrFunc = scheduledTimeoutFunctions.get(timerId);

                if (typeof numberOrFunc === 'number') {
                    const timerIdAndTimerType = unrespondedRequests.get(numberOrFunc);

                    if (timerIdAndTimerType === undefined
                            || timerIdAndTimerType.timerId !== timerId
                            || timerIdAndTimerType.timerType !== timerType) {
                        throw new Error('The timer is in an undefined state.');
                    }
                } else {
                    numberOrFunc();

                    // A timeout can be savely deleted because it is only called once.
                    scheduledTimeoutFunctions.delete(timerId);
                }
            }
        } else {
            const { id } = data;

            const { timerId, timerType } = unrespondedRequests.get(id);

            unrespondedRequests.delete(id);

            if (timerType === 'interval') {
                scheduledIntervalFunctions.delete(timerId);
            } else {
                scheduledTimeoutFunctions.delete(timerId);
            }
        }
    });

    const clearInterval = (timerId: number) => {
        const id = generateUniqueId(unrespondedRequests);

        unrespondedRequests.set(id, { timerId, timerType: 'interval' });
        scheduledIntervalFunctions.set(timerId, id);

        worker.postMessage(<IClearRequest> {
            id,
            method: 'clear',
            params: { timerId, timerType: 'interval' }
        });
    };

    const clearTimeout = (timerId: number) => {
        const id = generateUniqueId(unrespondedRequests);

        unrespondedRequests.set(id, { timerId, timerType: 'timeout' });
        scheduledTimeoutFunctions.set(timerId, id);

        worker.postMessage(<IClearRequest> {
            id,
            method: 'clear',
            params: { timerId, timerType: 'timeout' }
        });
    };

    const setInterval = (func: Function, delay: number) => {
        const timerId = generateUniqueId(scheduledIntervalFunctions);

        scheduledIntervalFunctions.set(timerId, () => {
            func();

            worker.postMessage(<ISetNotification> {
                id: null,
                method: 'set',
                params: {
                    delay,
                    now: performance.now(),
                    timerId,
                    timerType: 'interval'
                }
            });
        });

        worker.postMessage(<ISetNotification> {
            id: null,
            method: 'set',
            params: {
                delay,
                now: performance.now(),
                timerId,
                timerType: 'interval'
            }
        });

        return timerId;
    };

    const setTimeout = (func: Function, delay: number) => {
        const timerId = generateUniqueId(scheduledTimeoutFunctions);

        scheduledTimeoutFunctions.set(timerId, func);

        worker.postMessage(<ISetNotification> {
            id: null,
            method: 'set',
            params: {
                delay,
                now: performance.now(),
                timerId,
                timerType: 'timeout'
            }
        });

        return timerId;
    };

    return {
        clearInterval,
        clearTimeout,
        setInterval,
        setTimeout
    };
};
