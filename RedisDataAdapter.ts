import {
  AdapterResponse, IDataAdapter
} from 'statsig-node/dist/interfaces/IDataAdapter';
import * as redis from 'redis';
import { RedisClientOptions } from 'redis';

// Global prefix to ensure uniqueness of storage keys
const globalKeyPrefix = 'statsig-redis';
const timeKey = globalKeyPrefix + '-time';

export default class RedisDataAdapter implements IDataAdapter {
  private client;

  public constructor(hostname?: string, port?: number, password?: string, db?: number) {
    const options: RedisClientOptions = {
      socket: {
        host: hostname,
        port: port,
      },
      password: password
    };
    this.client = redis.createClient(options);
    if (db !== undefined) {
      this.client.select(db);
    }
  }

  public async get(key: string): Promise<AdapterResponse> {
    const result = await this.client.hGet(globalKeyPrefix, key);
    if (result == null) {
      return { error: new Error('key does not exist') };
    }
    const time = await this.client.hGet(globalKeyPrefix, timeKey)
    return {result, time: Number(time)}
  }

  public async getMulti(keys: string[]): Promise<AdapterResponse> {
    const result = {};
    const multi = this.client.multi();
    for (const key of keys) {
      result[key] = await this.client.hGet(globalKeyPrefix, key);
    }
    const time = await this.client.hGet(globalKeyPrefix, timeKey);
    return {result, time: Number(time)}
  }

  public async set(
    key: string,
    value: string,
    time?: number | undefined,
  ): Promise<void> {
    const multi = this.client.multi();
    multi.hSet(globalKeyPrefix, key, value);
    if (time !== undefined) {
      multi.hSet(key, timeKey, time);
    }
    multi.exec();
  }

  public async setMulti(
    records: Record<string, string>,
    time?: number,
  ): Promise<void> {
    const multi = this.client.multi();
    for (const itemKey in records) {
      multi.hSet(globalKeyPrefix, itemKey, records[itemKey]);
    }
    if (time !== undefined) {
      multi.hSet(globalKeyPrefix, timeKey, time);
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
}