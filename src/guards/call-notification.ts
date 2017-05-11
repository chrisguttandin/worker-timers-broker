import { ICallNotification, TWorkerTimersWorkerMessage } from 'worker-timers-worker';

export const isCallNotification = (message: TWorkerTimersWorkerMessage): message is ICallNotification => {
    return ((<ICallNotification> message).method !== undefined);
};
