import Surreal from 'surrealdb.js';

let dbInstance: Surreal | null = null;
let connectionPromise: Promise<Surreal> | null = null;

function getHttpEndpoint(endpoint: string): string {
  let httpEndpoint = endpoint;
  
  if (httpEndpoint.startsWith('wss://')) {
    httpEndpoint = httpEndpoint.replace('wss://', 'https://');
  } else if (httpEndpoint.startsWith('ws://')) {
    httpEndpoint = httpEndpoint.replace('ws://', 'http://');
  }
  
  if (!httpEndpoint.endsWith('/rpc')) {
    httpEndpoint = httpEndpoint.replace(/\/$/, '') + '/rpc';
  }
  
  return httpEndpoint;
}

async function createConnection(): Promise<Surreal> {
  const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
  const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
  const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

  if (!endpoint || !namespace || !token) {
    console.error('[DB] Missing credentials:', { 
      hasEndpoint: !!endpoint, 
      hasNamespace: !!namespace, 
      hasToken: !!token 
    });
    throw new Error('Database credentials not configured');
  }

  const httpEndpoint = getHttpEndpoint(endpoint);
  console.log('[DB] Connecting to:', httpEndpoint);

  const db = new Surreal();
  
  try {
    await db.connect(httpEndpoint, {
      namespace: namespace,
      database: 'zomi_translator',
    });
    console.log('[DB] Connected successfully');
  } catch (connectError: any) {
    const msg = connectError?.message || String(connectError);
    console.error('[DB] Connection failed:', msg);
    
    if (msg.includes('version') && msg.includes('supported')) {
      console.log('[DB] Version warning, continuing...');
    } else {
      await db.close().catch(() => {});
      throw new Error(`Database connection failed: ${msg}`);
    }
  }

  try {
    await db.use({ namespace: namespace, database: 'zomi_translator' });
    console.log('[DB] Using namespace:', namespace);
  } catch (useError: any) {
    const msg = useError?.message || String(useError);
    if (!msg.includes('already')) {
      console.error('[DB] Use namespace failed:', msg);
      await db.close().catch(() => {});
      throw new Error(`Failed to select database: ${msg}`);
    }
  }

  try {
    await db.authenticate(token);
    console.log('[DB] Authenticated');
  } catch (authError: any) {
    const msg = authError?.message || String(authError);
    console.error('[DB] Authentication failed:', msg);
    await db.close().catch(() => {});
    throw new Error(`Database authentication failed: ${msg}`);
  }

  try {
    const testResult = await db.query('SELECT 1 as test');
    console.log('[DB] Connection verified:', testResult);
  } catch (testError: any) {
    const msg = testError?.message || String(testError);
    console.error('[DB] Connection test failed:', msg);
    await db.close().catch(() => {});
    throw new Error(`Database connection test failed: ${msg}`);
  }

  return db;
}

export async function getDB(): Promise<Surreal> {
  if (dbInstance) {
    try {
      const testPromise = dbInstance.query('SELECT 1');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection check timeout')), 5000)
      );
      await Promise.race([testPromise, timeoutPromise]);
      return dbInstance;
    } catch (e) {
      console.log('[DB] Connection stale, reconnecting...', e);
      try {
        await dbInstance.close();
      } catch {}
      dbInstance = null;
      connectionPromise = null;
    }
  }

  if (connectionPromise) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 30000)
      );
      return await Promise.race([connectionPromise, timeoutPromise]);
    } catch (e) {
      console.error('[DB] Connection promise failed:', e);
      connectionPromise = null;
      throw e;
    }
  }

  connectionPromise = createConnection()
    .then((db) => {
      dbInstance = db;
      connectionPromise = null;
      return db;
    })
    .catch((error) => {
      connectionPromise = null;
      dbInstance = null;
      throw error;
    });

  return connectionPromise;
}

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    try {
      await dbInstance.close();
    } catch (err) {
      console.warn('[DB] Close error:', err);
    }
    dbInstance = null;
  }
  connectionPromise = null;
}

export async function withDB<T>(operation: (db: Surreal) => Promise<T>): Promise<T> {
  const db = await getDB();
  return operation(db);
}
