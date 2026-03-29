const pool = require('./src/config/db');
const { Pool } = require('pg');
require('dotenv').config();

const incidentPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_HshU9Ju0BNni@ep-restless-river-adnchs4u-pooler.c-2.us-east-1.aws.neon.tech/incident_db?sslmode=require&channel_binding=require'
});

async function sync() {
  try {
    console.log('🔄 Fetching responders from Incident DB directly...');
    const resp = await incidentPool.query('SELECT * FROM responders');
    const responders = resp.rows;

    console.log(`📦 Found ${responders.length} responders. Syncing...`);

    for (const r of responders) {
      const vType = r.type === 'police_car' ? 'police' : (r.type === 'fire_truck' ? 'fire_truck' : 'ambulance');
      
      await pool.query(
        `INSERT INTO vehicles (vehicle_id, plate_number, vehicle_type, station_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (vehicle_id) DO UPDATE SET
         plate_number = EXCLUDED.plate_number,
         vehicle_type = EXCLUDED.vehicle_type,
         station_id = EXCLUDED.station_id`,
        [r.responder_id, r.contact_phone || `UNIT-${r.responder_id.slice(0, 4)}`, vType, r.hospital_id]
      );
      console.log(`✅ Synced: ${r.name}`);
    }

    console.log('🎉 Sync complete!');
    process.exit(0);
  } catch (err) {
    if (err.response) {
      console.error('❌ Sync failed (Response):', err.response.status, err.response.data);
    } else {
      console.error('❌ Sync failed (Request):', err.message);
    }
    process.exit(1);
  }
}

sync();
