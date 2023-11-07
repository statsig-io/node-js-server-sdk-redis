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
import RedisDataAdapter from 'statsig-node-redis'
```
4. Create an instance of the `RedisDataAdapter`
```
const dataAdapter = new RedisDataAdapter({url: "redis://statsig:foo@bar.redis.server:6380"});
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
  redisOptions,
  statsigCacheKey,
);
```

| param | default | description |
| --- | --- | --- |
| redisOptions | {} | Options for initializing the Redis client (the database must be specified in order for the adapter to work) |
| statsigCacheKey  | 'statsig-redis' | The key that the adapter will use to store data in Redis |

## Links
[Node Redis](https://github.com/redis/node-redis)
