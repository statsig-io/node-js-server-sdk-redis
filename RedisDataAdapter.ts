// import { AdapterResponse, IDataAdapter, ConfigStore } from 'statsig-node/interfaces';
import {
  AdapterResponse, AdapterResult
} from 'statsig-node/dist/interfaces/IDataAdapter';
import {
  IDataAdapter
} from 'statsig-node/dist/interfaces/IDataAdapter';
import * as redis from 'redis';
import { RedisClientOptions } from 'redis';

// Global prefix to ensure uniqueness of storage keys
const globalKeyPrefix = 'statsig-redis';
const timeKey = globalKeyPrefix + '-time';

export default class RedisDataAdapter implements IDataAdapter {
  private client;

  public constructor(hostname: string, port?: number, password?: string) {
    const options: RedisClientOptions = {
      socket: {
        host: hostname,
        port: port,
      },
      password: password
    };
    this.client = redis.createClient(options);
  }

  public async get(key: string): Promise<AdapterResponse> {
    // Try fetching as master key
    const masterKey = globalKeyPrefix.concat('-', key);
    const maybeRecords = await this.client.hGetAll(masterKey);
    if (Object.entries(maybeRecords).length < 1) {
      // Fallback to single record
      const singleRecord = await this.client.hGet(globalKeyPrefix, key);
      if (singleRecord == null) {
        return { error: new Error('key does not exist') };
      }
      const time = await this.client.hGet(globalKeyPrefix, timeKey)
      return {result: JSON.parse(singleRecord), time: Number(time)}
    } else {
      for (const itemKey in maybeRecords) {
        maybeRecords[itemKey] = JSON.parse(maybeRecords[itemKey]);
      }
      const time = await this.client.hGet(timeKey, masterKey);
      return {result: maybeRecords, time: Number(time)}
    }
  }

  public async set(
    key: string,
    value: AdapterResult,
    time?: number | undefined,
  ): Promise<void> {
    const multi = this.client.multi();
    const masterKey = globalKeyPrefix;
    multi.hSet(masterKey, key, JSON.stringify(value));
    if (time !== undefined) {
      multi.hSet(key, timeKey, time);
    }
    multi.exec();
  }

  public async setMulti(
    records: Record<string, AdapterResult>,
    key?: string,
    time?: number,
  ): Promise<void> {
    const multi = this.client.multi();
    let masterKey = globalKeyPrefix;
    if (key != null && key != '') {
      masterKey = masterKey.concat('-', key);
    }
    for (const itemKey in records) {
      multi.hSet(masterKey, itemKey, JSON.stringify(records[itemKey]));
    }
    if (time !== undefined) {
      multi.hSet(timeKey, masterKey, time);
    }
    multi.exec();
  }

  public async initialize(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  public async shutdown(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  public clearCache(): void {
    if (this.client.isOpen) {
      this.client.flushAll();
    }
  }
}