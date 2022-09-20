import { AdapterResponse, IDataAdapter } from 'statsig-node/interfaces';
import * as redis from 'redis';
import { RedisClientOptions } from 'redis';
import { compressData, decompressData } from './utils';

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
    const value = await this.client.hGet(globalKeyPrefix, key);
    if (value == null) {
      return { error: new Error(`key (${key}) does not exist`) };
    }
    const decompressedData = decompressData(value);
    const time = await this.client.hGet(timeKey, key)
    return {result: decompressedData, time: Number(time)}
  }

  public async set(
    key: string,
    value: string,
    time?: number | undefined,
  ): Promise<void> {
    const multi = this.client.multi();
    const compressedData = compressData(value);
    multi.hSet(globalKeyPrefix, key, compressedData);
    if (time !== undefined) {
      multi.hSet(timeKey, key, time);
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