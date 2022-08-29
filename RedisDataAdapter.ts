// import { AdapterResponse, IDataAdapter, ConfigStore } from 'statsig-node/interfaces';
import {
  AdapterResponse
} from 'statsig-node/dist/interfaces/IDataAdapter';
import {
  IDataAdapter
} from 'statsig-node/dist/interfaces/IDataAdapter';
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
  public async getConfigs(): Promise<AdapterResponse> {
    return await this.fetchItem('configs');
  }
  public async setConfigs(
    configs: Record<string, unknown>,
    time?: number,
  ): Promise<void> {
    await this.updateItem('configs', configs, time);
  }

  public async getGates(): Promise<AdapterResponse> {
    return await this.fetchItem('gates');
  }
  public async setGates(
    gates: Record<string, unknown>,
    time?: number,
  ): Promise<void> {
    await this.updateItem('gates', gates, time);
  }
  public async getIDLists(): Promise<AdapterResponse> {
    return await this.fetchItem('id-lists');
  }
  public async setIDLists(
    idLists: Record<string, unknown>,
    time?: number,
  ): Promise<void> {
    await this.updateItem('id-lists', idLists, time);
  }
  public async getLayers(): Promise<AdapterResponse> {
    return await this.fetchItem('layers');
  }
  public async setLayers(
    layers: Record<string, unknown>,
    time?: number,
  ): Promise<void> {
    await this.updateItem('layers', layers, time);
  }
  public async getLayerConfigs(): Promise<AdapterResponse> {
    return await this.fetchItem('layer-configs');
  }
  public async setLayerConfigs(
    layerConfigs: Record<string, unknown>,
    time?: number,
  ): Promise<void> {
    await this.updateItem('layer-configs', layerConfigs, time);
  }

  private async fetchItem(key: string): Promise<AdapterResponse> {
    const record = await this.client.hGet(key, 'data');
    if (record === null) {
      return { error: new Error('item is invalid') };
    }
    if (record === undefined) {
      return { error: new Error('item is not defined') };
    }
    const result = JSON.parse(record);
    const time = await this.client.hGet(key, 'time');
      
    return {result: result, time: Number(time)}
  }

  private async updateItem(
    key: string,
    data: Record<string, unknown>,
    time?: number,
  ): Promise<void> {
    const multi = this.client.multi();
    multi.hSet(key, 'data', JSON.stringify(data));
    if (time !== undefined) {
      multi.hSet(key, 'time', time);
    }
    multi.exec();
  }

  public async initialize(): Promise<void> {
    await this.client.connect();
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