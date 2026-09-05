import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || '';

type NeonClient = ReturnType<typeof neon>;
let sqlClient: NeonClient | null = null;

export function getNeonSql(): NeonClient {
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not configured. Add it to your .env file (see .env.example).');
  }
  if (!sqlClient) {
    sqlClient = neon(connectionString);
  }
  return sqlClient;
}

export interface DbStatus {
  connected: boolean;
  version?: string;
  database?: string;
  user?: string;
  tableCount?: number;
  tables?: string[];
  error?: string;
}

/**
 * Check connectivity and retrieve Neon DB status
 */
export async function checkNeonStatus(): Promise<DbStatus> {
  try {
    const sql = getNeonSql();
    const info = (await sql`SELECT version(), current_database(), current_user`) as any[];
    const tablesRes = (await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `) as any[];
    const tables = tablesRes.map((r: any) => r.table_name);

    return {
      connected: true,
      version: info[0]?.version,
      database: info[0]?.current_database,
      user: info[0]?.current_user,
      tableCount: tables.length,
      tables,
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message || 'Failed to connect to Neon PostgreSQL',
    };
  }
}

/**
 * Initialize schema in Neon PostgreSQL
 */
export async function initNeonSchema(): Promise<void> {
  try {
    const sql = getNeonSql();
    console.log('[Neon PostgreSQL] Initializing database tables...');

    // 1. Unified persistent document store for fast atomic synchronization
    await sql`
      CREATE TABLE IF NOT EXISTS store_documents (
        collection_key VARCHAR(64) PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Relational products table for SQL queries
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(64) PRIMARY KEY,
        slug VARCHAR(128) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        selling_price NUMERIC(10, 2) NOT NULL,
        mrp NUMERIC(10, 2) NOT NULL,
        category_slug VARCHAR(64),
        is_active BOOLEAN DEFAULT TRUE,
        rating NUMERIC(3, 2) DEFAULT 4.5,
        total_reviews INTEGER DEFAULT 0,
        tags TEXT[],
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. Relational categories table
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(64) PRIMARY KEY,
        slug VARCHAR(128) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 4. Relational orders table
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(64) PRIMARY KEY,
        order_number VARCHAR(64) UNIQUE NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(32),
        customer_email VARCHAR(255),
        total_amount NUMERIC(10, 2) NOT NULL,
        payment_method VARCHAR(64) NOT NULL,
        status VARCHAR(64) NOT NULL,
        raw_order JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 5. Relational users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(32),
        role VARCHAR(32) NOT NULL DEFAULT 'CUSTOMER',
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 6. Relational settings table
    await sql`
      CREATE TABLE IF NOT EXISTS store_settings (
        setting_key VARCHAR(64) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('[Neon PostgreSQL] Schema initialization complete.');
  } catch (err) {
    console.error('[Neon PostgreSQL] Schema initialization error:', err);
    throw err;
  }
}

/**
 * Load store state from Neon PostgreSQL
 */
export async function loadStoreFromNeon(): Promise<any | null> {
  try {
    const sql = getNeonSql();
    const rows = (await sql`
      SELECT payload FROM store_documents WHERE collection_key = 'main_store' LIMIT 1
    `) as any[];
    if (rows && rows.length > 0 && rows[0].payload) {
      return rows[0].payload;
    }
    return null;
  } catch (err) {
    console.warn('[Neon PostgreSQL] Could not load store from Neon, will initialize:', err);
    return null;
  }
}

/**
 * Persist store state to Neon PostgreSQL
 */
export async function saveStoreToNeon(storeData: any): Promise<void> {
  try {
    const sql = getNeonSql();
    const payloadStr = JSON.stringify(storeData);

    // 1. Master document store
    await sql`
      INSERT INTO store_documents (collection_key, payload, updated_at)
      VALUES ('main_store', ${payloadStr}::jsonb, CURRENT_TIMESTAMP)
      ON CONFLICT (collection_key)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = CURRENT_TIMESTAMP;
    `;

    // 2. Relational products table sync
    if (Array.isArray(storeData.products) && storeData.products.length > 0) {
      await Promise.all(
        storeData.products.map((p: any) =>
          sql`
            INSERT INTO products (
              id, slug, title, selling_price, mrp, category_slug, is_active, rating, total_reviews, tags, metadata, updated_at
            ) VALUES (
              ${p.id}, ${p.slug}, ${p.title}, ${p.sellingPrice}, ${p.mrp}, ${p.categorySlug || null},
              ${p.isActive !== false}, ${p.rating || 4.5}, ${p.reviewCount || 0},
              ${[p.categoryName, p.badge, p.supplierCode].filter(Boolean)}, ${JSON.stringify(p)}::jsonb, CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              selling_price = EXCLUDED.selling_price,
              mrp = EXCLUDED.mrp,
              category_slug = EXCLUDED.category_slug,
              is_active = EXCLUDED.is_active,
              rating = EXCLUDED.rating,
              total_reviews = EXCLUDED.total_reviews,
              metadata = EXCLUDED.metadata,
              updated_at = CURRENT_TIMESTAMP;
          `
        )
      );
    }

    // 3. Relational categories sync
    if (Array.isArray(storeData.categories) && storeData.categories.length > 0) {
      await Promise.all(
        storeData.categories.map((c: any) =>
          sql`
            INSERT INTO categories (id, slug, name, description, is_active, sort_order)
            VALUES (${c.id}, ${c.slug}, ${c.name}, ${c.description || ''}, ${c.isActive !== false}, ${c.sortOrder || 0})
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              is_active = EXCLUDED.is_active,
              sort_order = EXCLUDED.sort_order;
          `
        )
      );
    }

    // 4. Relational orders sync
    if (Array.isArray(storeData.orders) && storeData.orders.length > 0) {
      await Promise.all(
        storeData.orders.map((o: any) =>
          sql`
            INSERT INTO orders (
              id, order_number, user_id, customer_name, customer_phone, customer_email,
              total_amount, payment_method, status, raw_order, updated_at
            ) VALUES (
              ${o.id}, ${o.orderNumber}, ${o.userId}, ${o.customerName || ''},
              ${o.customerPhone || ''}, ${o.customerEmail || ''}, ${o.totalAmount},
              ${o.paymentMethod}, ${o.status}, ${JSON.stringify(o)}::jsonb, CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              raw_order = EXCLUDED.raw_order,
              updated_at = CURRENT_TIMESTAMP;
          `
        )
      );
    }

    // 5. Relational settings sync
    if (storeData.settings && typeof storeData.settings === 'object') {
      const entries = Object.entries(storeData.settings);
      await Promise.all(
        entries.map(([k, v]) =>
          sql`
            INSERT INTO store_settings (setting_key, setting_value, updated_at)
            VALUES (${k}, ${String(v)}, CURRENT_TIMESTAMP)
            ON CONFLICT (setting_key) DO UPDATE SET
              setting_value = EXCLUDED.setting_value,
              updated_at = CURRENT_TIMESTAMP;
          `
        )
      );
    }
  } catch (err) {
    console.error('[Neon PostgreSQL] Failed to save store to Neon:', err);
  }
}
