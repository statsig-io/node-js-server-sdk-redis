import { AdapterResponse, IDataAdapter, ConfigStore } from 'statsig-node/interfaces';
import * as redis from 'redis';
import { RedisClientOptions } from 'redis';

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

  public async fetchStore(): Promise<AdapterResponse> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
    const obj = await this.client.hGetAll('config-store');
    if (obj === null) {
      return { error: new Error('store is empty') };
    }

    const result: { [key: string]: any } = {
      gates: {},
      configs: {},
      idLists: {},
      layers: {},
      experimentToLayer: {},
    };
    for (const key in obj) {
      if (Object.hasOwnProperty.call(obj, key)) {
        result[key] = JSON.parse(obj[key]);
      }
    }
    const time = await this.client.get('time');

    return {store: result as ConfigStore, time: Number(time)} ;
  }

  public async fetchFromStore(item: string): Promise<AdapterResponse> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
    const record = await this.client.hGet('config-store', item);
    if (record === null) {
      return { error: new Error('item is invalid') };
    }
    if (record === undefined) {
      return { error: new Error('item is not defined') };
    }
    const time = await this.client.get('time');
      
    return {item: JSON.parse(record), time: Number(time)}
  }

  public async updateStore(store: ConfigStore, time?: number): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
    const multi = this.client.multi();
    if (store.gates) {
      multi.hSet('config-store', 'gates', JSON.stringify(store.gates));
    }
    if (store.configs) {
      multi.hSet('config-store', 'configs', JSON.stringify(store.configs));
    }
    if (store.idLists) {
      multi.hSet('config-store', 'idLists', JSON.stringify(store.idLists));
    }
    if (store.layers) {
      multi.hSet('config-store', 'layers', JSON.stringify(store.layers));
    }
    if (store.experimentToLayer) {
      multi.hSet(
        'config-store',
        'experimentToLayer',
        JSON.stringify(store.experimentToLayer),
      );
    }
    if (time) {
      multi.set('time', time);
    }
    await multi.exec();
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