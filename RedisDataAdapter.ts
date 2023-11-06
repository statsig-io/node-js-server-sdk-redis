import { AdapterResponse, IDataAdapter } from "statsig-node";
import * as redis from "redis";
import { RedisClientOptions } from "redis";
import { compressData, decompressData } from "./utils";

export default class RedisDataAdapter implements IDataAdapter {
  private globalKey = "statsig-redis";
  private client;

  public constructor(
    hostname?: string,
    port?: number,
    password?: string,
    db?: number
  ) {
    const options: RedisClientOptions = {
      socket: {
        host: hostname,
        port: port,
      },
      password: password,
    };
    this.client = redis.createClient(options);
    if (db !== undefined) {
      this.client.connect();
      this.client.select(db);
    }
  }

  public setGlobalKey(key: string) {
    this.globalKey = key;
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
    const multi = this.client.multi();
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
