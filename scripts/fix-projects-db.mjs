import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.dooqyiixoxiampojghqt:LIFEITSBLESSING143%40@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const VERCEL_TOKEN = 'FHRVsKgtJHoEX2aokKnYD5iD';
const USER_EMAIL = 'cogitoergosum143@gmail.com';

const sql = postgres(DATABASE_URL);

async function fix() {
  console.log('Fixing projects database...\n');

  const projects = await sql`SELECT id, name, vercel_project_name, primary_domain FROM projects`;
  console.log('Current projects:', JSON.stringify(projects, null, 2));

  const deleted = await sql`DELETE FROM projects RETURNING name`;
  console.log('\nDeleted', deleted.length, 'projects');

  const users = await sql`SELECT id FROM users WHERE email = ${USER_EMAIL} LIMIT 1`;
  const userId = users[0]?.id;
  if (!userId) {
    console.error('User not found');
    await sql.end();
    process.exit(1);
  }
  console.log('\nUser ID:', userId);

  console.log('\nFetching from Vercel...');
  const res = await fetch('https://api.vercel.com/v9/projects', {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
  });
  const data = await res.json();
  
  if (!data.projects) {
    console.error('Failed to fetch Vercel projects:', data);
    await sql.end();
    process.exit(1);
  }
  
  console.log('Found', data.projects.length, 'Vercel projects');

  for (const vp of data.projects) {
    const domain = vp.name + '.vercel.app';
    try {
      await sql`
        INSERT INTO projects (user_id, name, type, vercel_project_id, vercel_project_name, primary_domain, last_deployment_status, last_deployed_at)
        VALUES (${userId}, ${vp.name}, 'web_app', ${vp.id}, ${vp.name}, ${domain}, 'ready', NOW())
      `;
      console.log('Added:', vp.name);
    } catch (err) {
      console.log('Error:', vp.name, '-', err.message);
    }
  }

  const final = await sql`SELECT name, primary_domain FROM projects`;
  console.log('\nFinal projects:', final);

  await sql.end();
  console.log('\nDone! Refresh /projects page.');
}

fix().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
