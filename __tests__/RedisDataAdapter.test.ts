import RedisDataAdapter from '../RedisDataAdapter';
import * as redis from 'redis';
import * as statsigsdk from 'statsig-node';
// @ts-ignore
const statsig = statsigsdk.default;

describe('Validate redis config adapter functionality', () => {
  const serverKey = 'secret-9IWfdzNwExEYHEW4YfOQcFZ4xreZyFkbOXHaNbPsMwW'; 
    // --> Project: "Statsig - evaluation test", "Kong" server key
  const dbNumber = 1;
  const dataAdapter = new RedisDataAdapter(
    undefined, /* default */
    undefined, /* default */
    undefined, /* default */
    dbNumber,
  );
  const client = redis.createClient();
  const statsigOptions = {
    dataAdapter: dataAdapter,
    environment: { tier: 'staging' },
  };
  const user = {
    userID: '12345',
    email: 'kenny@nfl.com',
    custom: { level: 9 },
  };

  beforeEach(async () => {
    statsig._instance = null;
    await dataAdapter.initialize();
    await client.connect();
    await client.select(dbNumber);
  })

  afterEach(async () => {
    await client.flushDb();
    await client.quit();
    await dataAdapter.shutdown();
  });

  async function loadRedisStore() {
    await statsig.initialize(serverKey, statsigOptions);
    await statsig.shutdown();
  }

  async function verifyConfigSpecsFromAdapter() {
    const statsigKeys = await client.hKeys('statsig-redis');
    expect(statsigKeys.length).toBeGreaterThanOrEqual(1);
  
    const { result, error, time } = await dataAdapter.get(statsigKeys[0]);
    expect(result).not.toBeUndefined();
    expect(time).not.toBeUndefined();
    expect(error).toBeUndefined();

    const configSpecs = JSON.parse(result as string);
    return configSpecs;
  }

  test('Simple get/set', async () => {
    dataAdapter.set('gates', 'test123');
    const { result: gates } = await dataAdapter.get('gates');
    if (gates == null) {
      return;
    }
    expect(gates).toEqual('test123');
  });

  test('Verify successful downstream update from network to Redis', async () => {
    let redisKeys = await client.keys('*');
    expect(redisKeys.length).toEqual(0);

    // Initialize with network
    await statsig.initialize(serverKey, statsigOptions);

    redisKeys = await client.keys('*');
    expect(redisKeys.length).toBeGreaterThanOrEqual(1);
    expect(redisKeys).toContain('statsig-redis');

    await verifyConfigSpecsFromAdapter();
    await statsig.shutdown();
  });

  test('Verify Statsig works when network is down', async () => {
    expect(async () => await statsig.checkGate(user, '')).rejects.toThrow();

    await loadRedisStore();

    // Initialize without network
    await statsig.initialize(serverKey, { localMode: true, ...statsigOptions });
    
    const configSpecs = await verifyConfigSpecsFromAdapter();

    const exampleGate = configSpecs["feature_gates"][0];
    expect(exampleGate).not.toBeNull();
    expect(async () => await statsig.checkGate(user, exampleGate.name)).not.toThrow();
    await statsig.shutdown();
  });
})