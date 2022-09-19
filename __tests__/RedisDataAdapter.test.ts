import RedisDataAdapter from '../RedisDataAdapter';
import { ConfigSpec } from './utils';
import exampleConfigSpecs from '../jest.setup';
import * as redis from 'redis';
import * as statsigsdk from 'statsig-node';
// @ts-ignore
const statsig = statsigsdk.default;

describe('Validate redis config adapter functionality', () => {
  const serverKey = 'secret-9IWfdzNwExEYHEW4YfOQcFZ4xreZyFkbOXHaNbPsMwW'; 
    // --> Project: "Statsig - evaluation test", "Kong" server key
  const dbNumber = 1;
  const dataAdapter = new RedisDataAdapter();
  const statsigOptions = {
    dataAdapter: dataAdapter,
    environment: { tier: 'staging' },
  };
  const user = {
    userID: '12345',
    email: 'kenny@nfl.com',
    custom: { level: 9 },
  };

  beforeEach(() => {
    statsig._instance = null;
  })

  afterEach(async () => {
    const client = redis.createClient();
    client.connect();
    client.select(dbNumber);
    client.flushDb();
    client.quit();
    await dataAdapter.shutdown();
    await statsig.shutdown();
  });

  test('Verify that config specs can be fetched from redis store when network is down', async () => {
    // Manually set up redis store
    const gates: Record<string, ConfigSpec> = {};
    const configs: Record<string, ConfigSpec> = {};
    gates[exampleConfigSpecs.gate.name]
      = new ConfigSpec(exampleConfigSpecs.gate);
    configs[exampleConfigSpecs.config.name]
      = new ConfigSpec(exampleConfigSpecs.config);
    const time = Date.now();
    await dataAdapter.initialize();
    await dataAdapter.setMulti(
      { 'configs': configs, 'gates': gates },
      'config-specs',
      time,
    );

    // Initialize without network
    await statsig.initialize(serverKey, { localMode: true, ...statsigOptions });

    // Check gates
    const passesGate = await statsig.checkGate(user, 'nfl_gate');
    expect(passesGate).toEqual(true);

    // Check configs
    const config = await statsig.getConfig(
      user,
      exampleConfigSpecs.config.name,
    );
    expect(config.getValue('seahawks', null))
      .toEqual({ name: 'Seattle Seahawks', yearFounded: 1974 });
  });
  
  test('Verify that redis store is updated when network response can be received', async () => {
    expect.assertions(2)

    // Initialize with network
    await statsig.initialize(serverKey, statsigOptions);

    const { result: configSpecs } = await dataAdapter.get('config-specs');
    if (configSpecs == null) {
      return;
    }

    // Check gates
    const gates = configSpecs['gates'];
    if (gates == null) {
      return;
    }
    // @ts-ignore
    expect(gates['test_email_regex'].defaultValue).toEqual(false);

    // Check configs
    const configs = configSpecs['configs'];
    if (configs == null) {
      return;
    }
    // @ts-ignore
    expect(configs['test_custom_config'].defaultValue)
      .toEqual({ "header_text": "new user test", "foo": "bar" });
  });

  test('Verify bootstrap properly gets synced in redis', async () => {
    expect.assertions(2);

    const jsonResponse = {
      time: Date.now(),
      feature_gates: [
        exampleConfigSpecs.gate,
      ],
      dynamic_configs: [exampleConfigSpecs.config],
      layer_configs: [],
      has_updates: true,
    };

    // Bootstrap without network
    await statsig.initialize(serverKey, {
      localMode: true,
      bootstrapValues: JSON.stringify(jsonResponse),
      ...statsigOptions,
    });
    
    const { result: configSpecs } = await dataAdapter.get('config-specs');
    if (configSpecs == null) {
      return;
    }

    // Check gates
    const gates = configSpecs['gates'];
    if (gates == null) {
      return;
    }
    const expectedGates: Record<string, ConfigSpec> = {};
    expectedGates[exampleConfigSpecs.gate.name]
      = new ConfigSpec(exampleConfigSpecs.gate);
    expect(gates).toEqual(expectedGates);

    // Check configs
    const configs = configSpecs['configs'];
    if (configs == null) {
      return;
    }
    const expectedConfigs: Record<string, ConfigSpec> = {};
    expectedConfigs[exampleConfigSpecs.config.name]
      = new ConfigSpec(exampleConfigSpecs.config);
    expect(configs).toEqual(expectedConfigs);
  });

  test('Verify that single item fetching works', async () => {
    // Initialize with network
    await statsig.initialize(serverKey, statsigOptions);

    // Check id lists
    const {result: idLists} = await dataAdapter.get('id-lists');
    expect(idLists).not.toBeNull();
    expect(idLists).not.toBeUndefined();
    expect(idLists).not.toEqual({});

    // @ts-ignore
    expect(idLists['user_id_list'].fileID).not.toBeFalsy();
  });
})