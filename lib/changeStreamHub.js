import Task from './models/Task';
import Entry from './models/Entry';
import Project from './models/Project';

const WATCHED_MODELS = [Task, Entry, Project];

// Cache across hot-reloads/requests, same pattern as lib/mongodb.js
function getHub() {
  if (global._changeStreamHub) return global._changeStreamHub;

  const subscribers = new Set(); // { userId, notify }

  const notifyOwner = (change) => {
    const ownerId = change.fullDocument?.userId?.toString();
    for (const sub of subscribers) {
      // If we can't tell who owns the changed doc (e.g. a delete, with no
      // pre-image support), fall back to notifying everyone — each client's
      // own REST fetch is already scoped by userId, so this is harmless.
      if (!ownerId || sub.userId === ownerId) sub.notify();
    }
  };

  const streams = WATCHED_MODELS.map(Model => {
    const stream = Model.watch([], { fullDocument: 'updateLookup' });
    stream.on('change', notifyOwner);
    stream.on('error', (err) => {
      console.error(`[changeStreamHub] ${Model.modelName} stream error:`, err);
      global._changeStreamHub = null; // force re-init on next subscribe
    });
    return stream;
  });

  global._changeStreamHub = { subscribers, streams };
  return global._changeStreamHub;
}

export function subscribe(userId, notify) {
  const hub = getHub();
  const sub = { userId, notify };
  hub.subscribers.add(sub);
  return () => hub.subscribers.delete(sub);
}
