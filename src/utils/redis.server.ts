import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisClientSingleton = () => {
    if (process.env.REDIS_URL) {
        return new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: null,
        });
    }

    return new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: null, // Required by BullMQ
    });
};

declare global {
    var redis: undefined | ReturnType<typeof redisClientSingleton>;
}

const redis = globalThis.redis ?? redisClientSingleton();

export { redis };

if (process.env.NODE_ENV !== 'production') globalThis.redis = redis;
