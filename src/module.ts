import { IClearRequest, ISetNotification, IWorkerEvent, TTimerType } from 'worker-timers-worker';
import { isCallNotification } from './guards/call-notification';
import { isClearResponse } from './guards/clear-response';

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

    worker.addEventListener('message', ({ data }: IWorkerEvent) => {
        if (isCallNotification(data)) {
            const { params: { timerId, timerType } } = data;

            if (timerType === 'interval') {
                const idOrFunc = scheduledIntervalFunctions.get(timerId);

                if (typeof idOrFunc === 'number') {
                    const timerIdAndTimerType = unrespondedRequests.get(idOrFunc);

                    if (timerIdAndTimerType === undefined
                            || timerIdAndTimerType.timerId !== timerId
                            || timerIdAndTimerType.timerType !== timerType) {
                        throw new Error('The timer is in an undefined state.');
                    }
                } else if (typeof idOrFunc !== 'undefined') {
                    idOrFunc();
                } else {
                    throw new Error('The timer is in an undefined state.');
                }

            } else if (timerType === 'timeout') {
                const idOrFunc = scheduledTimeoutFunctions.get(timerId);

                if (typeof idOrFunc === 'number') {
                    const timerIdAndTimerType = unrespondedRequests.get(idOrFunc);

                    if (timerIdAndTimerType === undefined
                            || timerIdAndTimerType.timerId !== timerId
                            || timerIdAndTimerType.timerType !== timerType) {
                        throw new Error('The timer is in an undefined state.');
                    }
                } else if (typeof idOrFunc !== 'undefined') {
                    idOrFunc();

                    // A timeout can be savely deleted because it is only called once.
                    scheduledTimeoutFunctions.delete(timerId);
                } else {
                    throw new Error('The timer is in an undefined state.');
                }
            }
        } else if (isClearResponse(data)) {
            const { id } = data;

            const timerIdAndTimerType = unrespondedRequests.get(id);

            if (timerIdAndTimerType === undefined) {
                throw new Error('The timer is in an undefined state.');
            } else {
                const { timerId, timerType } = timerIdAndTimerType;

                unrespondedRequests.delete(id);

                if (timerType === 'interval') {
                    scheduledIntervalFunctions.delete(timerId);
                } else {
                    scheduledTimeoutFunctions.delete(timerId);
                }
            }
        } else {
            console.log(data);
            const { error: { message } } = data;

            throw new Error(message);
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

            // Doublecheck if the interval should still be rescheduled because it could have been cleared inside of func().
            if (typeof scheduledIntervalFunctions.get(timerId) === 'function') {
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
            }
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
