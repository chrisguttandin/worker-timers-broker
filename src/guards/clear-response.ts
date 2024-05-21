import { IClearResponse, TWorkerMessage } from 'worker-timers-worker';

export const isClearResponse = (message: TWorkerMessage): message is IClearResponse => {
    return typeof message.id === 'number' && typeof (<IClearResponse>message).result === 'boolean';
};
