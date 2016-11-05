const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || Math.pow(2, 53) - 1;

const generateUniqueId = (map) => {
    let id = Math.round(Math.random() * MAX_SAFE_INTEGER);

    while (map.has(id)) {
        id = Math.round(Math.random() * MAX_SAFE_INTEGER);
    }

    return id;
};

export const load = (url: string) => {
    const scheduledIntervalFunctions: Map<number, Function> = new Map();
    const scheduledTimeoutFunctions: Map<number, Function> = new Map();

    const worker = new Worker(url);

    worker.addEventListener('message', ({ data: { id, type } }) => {
        if (type === 'interval') {
            const func = scheduledIntervalFunctions.get(id);

            if (func) {
                func();
            }

        } else if (type === 'timeout') {
            const func = scheduledTimeoutFunctions.get(id);

            if (func) {
                func();

                // A timeout can be savely deleted because it is only called once.
                scheduledTimeoutFunctions.delete(id);
            }
        }

        // @todo Maybe throw an error.
    });

    const clearInterval = (id: number) => {
        scheduledIntervalFunctions.delete(id);

        worker.postMessage({
            action: 'clear',
            id,
            type: 'interval'
        });
    };

    const clearTimeout = (id: number) => {
        scheduledTimeoutFunctions.delete(id);

        worker.postMessage({
            action: 'clear',
            id,
            type: 'timeout'
        });
    };

    const setInterval = (func: Function, delay: number) => {
        const id = generateUniqueId(scheduledIntervalFunctions);

        scheduledIntervalFunctions.set(id, () => {
            func();

            worker.postMessage({
                action: 'set',
                delay,
                id,
                now: performance.now(),
                type: 'interval'
            });
        });

        worker.postMessage({
            action: 'set',
            delay,
            id,
            now: performance.now(),
            type: 'interval'
        });

        return id;
    };

    const setTimeout = (func: Function, delay: number) => {
        const id = generateUniqueId(scheduledTimeoutFunctions);

        scheduledTimeoutFunctions.set(id, func);

        worker.postMessage({
            action: 'set',
            delay,
            id,
            now: performance.now(),
            type: 'timeout'
        });

        return id;
    };

    return {
        clearInterval,
        clearTimeout,
        setInterval,
        setTimeout
    };
};
