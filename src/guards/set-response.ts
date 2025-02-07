import { ISetResponse, TWorkerMessage } from 'worker-timers-worker';

export const isSetResponse = (message: TWorkerMessage): message is ISetResponse => {
    return typeof message.id === 'number' && typeof (<ISetResponse>message).result === 'object';
};
