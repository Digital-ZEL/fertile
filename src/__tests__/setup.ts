/**
 * Test setup file
 * Configures fake-indexeddb for testing
 */

import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';

// Reset database between tests
beforeEach(async () => {
  // Delete any existing database
  const databases = (await indexedDB.databases?.()) || [];
  for (const db of databases) {
    if (db.name) {
      indexedDB.deleteDatabase(db.name);
    }
  }
});
