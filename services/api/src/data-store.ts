import { PrismaRookStore } from './prisma-store.js';
import { store as memoryStore } from './store.js';

export const dataStore = process.env.DATA_MODE === 'postgres'
  ? new PrismaRookStore()
  : memoryStore;
