import { IDefaultBrokerDefinition } from 'broker-factory';
import { IWorkerTimersBrokerDefinition } from '../interfaces';

export type TWorkerTimersBrokerLoader = (url: string) => IWorkerTimersBrokerDefinition & IDefaultBrokerDefinition;
