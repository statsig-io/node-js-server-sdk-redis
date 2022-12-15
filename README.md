# Statsig Node Server SDK - Redis Integration
[![npm version](https://badge.fury.io/js/statsig-node-redis.svg)](https://badge.fury.io/js/statsig-node-redis) 

A first party Redis integration with the [Statsig server-side Node.js SDK](https://github.com/statsig-io/node-js-server-sdk).

## Quick Setup
1. Install the Statsig Node SDK
```
npm install statsig-node
```
2. Install this package
```
npm install statsig-node-redis
```
3. Import the package
```
import { RedisDataAdapter } from 'statsig-node-redis'
```
4. Create an instance of the `RedisDataAdapter`
```
const dataAdapter = new RedisDataAdapter();
```
5. When initializing the `statsig` sdk, add the adapter to options
```
await statsig.initialize(
    'server-secret-key',
    { dataAdapter: dataAdapter },
);
```

## Customizing the adapter
When initializing `RedisDataAdapter`, you can specify the following options:
```
const dataAdapter = new RedisDataAdapter(
  hostname,
  port,
  password,
  db,
);
```

| param | default | description |
| --- | --- | --- |
| hostname  | 'localhost' | Redis server hostname |
| port  | 6379 | Redis server port |
| password  | | ACL password or the old "--requirepass" password |
| db | 0 | Redis database number (supports 16 databases) |

## Links
[Node Redis](https://github.com/redis/node-redis)
