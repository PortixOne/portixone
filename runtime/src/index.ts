import { bootstrap } from './lifecycle/bootstrap.service.js';

bootstrap().catch((error: unknown) => {
  console.error('Failed to start PortixOne Runtime:', error);
  process.exit(1);
});
