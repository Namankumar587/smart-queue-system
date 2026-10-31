import { EventEmitter } from 'events';

class QueueEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow ample listeners for concurrent SSE streams
    this.setMaxListeners(200);
  }
}

export const queueEvents = new QueueEventBus();

