import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
const sql = fs.readFileSync(sqlFile, 'utf-8');

const client = new pg.Client({
  connectionString: 'postgresql://postgres.xvpwphixonefftqfdyhx:794503651Lhf@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  console.log('Connected to Supabase database');
  await client.query(sql);
  console.log('Migration executed successfully!');

  // Verify tables
  const res = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  console.log('Tables created:', res.rows.map(r => r.table_name).join(', '));
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  await client.end();
}
