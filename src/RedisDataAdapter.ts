import { AdapterResponse, IDataAdapter } from "statsig-node";
import * as redis from "redis";
import { RedisClientOptions } from "redis";
import { compressData, decompressData } from "./utils";

export default class RedisDataAdapter implements IDataAdapter {
  private globalKey = "statsig-redis";
  private client;

  public constructor(
    redisOptions: RedisClientOptions,
    statsigCacheKey?: string
  ) {
    this.client = redis.createClient(redisOptions);
    if (redisOptions.database !== undefined) {
      this.client.connect();
      this.client.select(redisOptions.database);
    }
    if (statsigCacheKey) {
      this.globalKey = statsigCacheKey;
    }
  }

  public async get(key: string): Promise<AdapterResponse> {
    const value = await this.client.hGet(this.globalKey, key);
    if (value == null) {
      return { error: new Error(`key (${key}) does not exist`) };
    }
    const decompressedData = decompressData(value);
    return { result: decompressedData };
  }

  public async set(
    key: string,
    value: string,
    time?: number | undefined
  ): Promise<void> {
    const compressedData = compressData(value);
    await this.client.hSet(this.globalKey, key, compressedData);
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
