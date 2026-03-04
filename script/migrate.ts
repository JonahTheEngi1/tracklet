import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("[migrate] Running database migrations...");

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('admin', 'manager', 'employee');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE pricing_type AS ENUM ('per_pound', 'range_based');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE invoice_status AS ENUM ('paid', 'unpaid');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // ADD VALUE cannot run inside a DO block or transaction in PostgreSQL.
    // We must check manually then run as a top-level statement outside a transaction.
    const enumCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'voided'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'invoice_status')
      ) AS has_voided;
    `);

    if (!enumCheck.rows[0].has_voided) {
      // Release the client first, then run outside any transaction
      client.release();
      const directClient = await pool.connect();
      try {
        await directClient.query("COMMIT");
        await directClient.query("ALTER TYPE invoice_status ADD VALUE 'voided'");
        console.log("[migrate] Added 'voided' to invoice_status enum.");
      } finally {
        directClient.release();
      }
      // Reconnect for the rest of the migration
      const newClient = await pool.connect();
      await runTableMigrations(newClient);
      newClient.release();
    } else {
      await runTableMigrations(client);
      client.release();
    }

    console.log("[migrate] Database migrations completed successfully.");
    await pool.end();
    return;
  } catch (error) {
    console.error("[migrate] Migration failed:", error);
    try { client.release(); } catch (e) {}
    await pool.end();
    throw error;
  }
}

async function runTableMigrations(client: pg.PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS locations (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      pricing_enabled BOOLEAN NOT NULL DEFAULT false,
      pricing_type pricing_type DEFAULT 'per_pound',
      per_pound_rate NUMERIC(10,2),
      created_at TIMESTAMP DEFAULT now(),
      is_suspended BOOLEAN NOT NULL DEFAULT false,
      invoice_enabled BOOLEAN NOT NULL DEFAULT false,
      invoice_logo TEXT,
      invoice_business_name TEXT
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      auth_user_id VARCHAR NOT NULL UNIQUE,
      role user_role NOT NULL DEFAULT 'employee',
      location_id VARCHAR,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS storage_locations (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      location_id VARCHAR NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS pricing_tiers (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      location_id VARCHAR NOT NULL,
      min_weight NUMERIC(10,2) NOT NULL,
      max_weight NUMERIC(10,2) NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS packages (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      location_id VARCHAR NOT NULL,
      tracking_number TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      weight NUMERIC(10,2) NOT NULL,
      storage_location_id VARCHAR,
      notes TEXT,
      is_delivered BOOLEAN NOT NULL DEFAULT false,
      picked_up_by_last_name TEXT,
      delivered_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS archived_packages (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      location_id VARCHAR NOT NULL,
      tracking_number TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      picked_up_by_last_name TEXT,
      delivered_at TIMESTAMP NOT NULL,
      archived_at TIMESTAMP DEFAULT now()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS backup_settings (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      api_key_configured BOOLEAN NOT NULL DEFAULT false,
      frequency_hours INTEGER NOT NULL DEFAULT 24,
      enabled BOOLEAN NOT NULL DEFAULT false,
      last_backup_at TIMESTAMP,
      updated_at TIMESTAMP DEFAULT now()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS location_backups (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      location_id VARCHAR NOT NULL,
      bin_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      location_id VARCHAR NOT NULL,
      user_id VARCHAR NOT NULL,
      subject TEXT NOT NULL,
      status ticket_status NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now(),
      resolved_at TIMESTAMP,
      archived_bin_id TEXT
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ticket_messages (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id VARCHAR NOT NULL,
      sender_id VARCHAR NOT NULL,
      is_admin BOOLEAN NOT NULL DEFAULT false,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      location_id VARCHAR NOT NULL,
      invoice_number TEXT NOT NULL,
      billed_to TEXT NOT NULL,
      due_date TIMESTAMP NOT NULL,
      status invoice_status NOT NULL DEFAULT 'unpaid',
      subtotal NUMERIC(10,2) NOT NULL DEFAULT '0',
      total NUMERIC(10,2) NOT NULL DEFAULT '0',
      created_at TIMESTAMP DEFAULT now(),
      created_by VARCHAR NOT NULL
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id VARCHAR NOT NULL,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price NUMERIC(10,2) NOT NULL,
      total NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  const alterStatements = [
    "ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false",
    "ALTER TABLE locations ADD COLUMN IF NOT EXISTS invoice_enabled BOOLEAN NOT NULL DEFAULT false",
    "ALTER TABLE locations ADD COLUMN IF NOT EXISTS invoice_logo TEXT",
    "ALTER TABLE locations ADD COLUMN IF NOT EXISTS invoice_business_name TEXT",
  ];

  for (const stmt of alterStatements) {
    try {
      await client.query(stmt);
    } catch (e) {}
  }
}

migrate();
