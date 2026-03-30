const pool = require('./src/config/db');
const { Pool } = require('pg');
require('dotenv').config();

const incidentPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_HshU9Ju0BNni@ep-restless-river-adnchs4u-pooler.c-2.us-east-1.aws.neon.tech/incident_db?sslmode=require&channel_binding=require'
});

async function sync() {
  try {
    console.log('🔄 Wiping existing dispatch vehicles...');
    await pool.query('TRUNCATE TABLE vehicles CASCADE');

    console.log('🔄 Fetching responders from Incident DB...');
    const resp = await incidentPool.query('SELECT * FROM responders');
    const responders = resp.rows;

    console.log(`📦 Found ${responders.length} responders. Syncing...`);

    for (const r of responders) {
      const vType = r.type === 'police_car' ? 'police' : (r.type === 'fire_truck' ? 'fire_truck' : 'ambulance');
      
      console.log(`   SYNCING: "${r.name}" (ID: ${r.responder_id})`);
      
      await pool.query(
        `INSERT INTO vehicles (vehicle_id, plate_number, vehicle_type, station_id, driver_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (vehicle_id) DO UPDATE SET
         plate_number = EXCLUDED.plate_number,
         vehicle_type = EXCLUDED.vehicle_type,
         station_id = EXCLUDED.station_id,
         driver_id = EXCLUDED.driver_id`,
        [r.responder_id, r.contact_phone || `UNIT-${r.responder_id.slice(0, 4)}`, vType, r.hospital_id, r.driver_id]
      );
    }

    console.log('🎉 Sync complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
    process.exit(1);
  }
}

sync();
