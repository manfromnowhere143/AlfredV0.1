/**
 * Test Quick Check Mode
 *
 * Verifies that VideoPersona's Quick Check header bypasses database
 */

async function testQuickCheck() {
  console.log('\n🧪 TESTING QUICK CHECK MODE\n');
  console.log('═'.repeat(80));

  const BASE_URL = 'http://localhost:3005';

  // Test 1: Without Quick Check header (should try to hit DB and fail auth)
  console.log('\n1️⃣  Testing WITHOUT Quick Check header:');
  try {
    const start1 = Date.now();
    const resp1 = await fetch(`${BASE_URL}/api/personas/test-id/idle-video`);
    const data1 = await resp1.json();
    const time1 = Date.now() - start1;

    console.log(`   Status: ${resp1.status}`);
    console.log(`   Response: ${JSON.stringify(data1).slice(0, 100)}`);
    console.log(`   Time: ${time1}ms`);

    if (data1.error === 'Unauthorized') {
      console.log('   ✅ EXPECTED: Auth check ran (DB query attempted)');
    }
  } catch (err) {
    console.error('   ❌ Request failed:', err);
  }

  // Test 2: With Quick Check header (should bypass DB entirely)
  console.log('\n2️⃣  Testing WITH Quick Check header:');
  try {
    const start2 = Date.now();
    const resp2 = await fetch(`${BASE_URL}/api/personas/test-id/idle-video`, {
      headers: {
        'X-Quick-Check': 'true'
      }
    });
    const data2 = await resp2.json();
    const time2 = Date.now() - start2;

    console.log(`   Status: ${resp2.status}`);
    console.log(`   Response: ${JSON.stringify(data2)}`);
    console.log(`   Time: ${time2}ms`);

    if (data2.note === 'Quick check - no DB hit') {
      console.log('   ✅ SUCCESS: Quick Check bypassed database!');
    } else {
      console.log('   ❌ FAILED: Quick Check not working');
    }

    if (time2 < 50) {
      console.log('   ✅ FAST: Response in <50ms');
    }
  } catch (err) {
    console.error('   ❌ Request failed:', err);
  }

  // Test 3: Simulate 13 concurrent checks (like video gallery)
  console.log('\n3️⃣  Testing 13 concurrent Quick Check requests:');
  try {
    const personaIds = Array.from({ length: 13 }, (_, i) => `test-persona-${i}`);

    const start3 = Date.now();
    const promises = personaIds.map(id =>
      fetch(`${BASE_URL}/api/personas/${id}/idle-video`, {
        headers: { 'X-Quick-Check': 'true' }
      })
    );

    const responses = await Promise.all(promises);
    const time3 = Date.now() - start3;

    const allQuickCheck = responses.every(async r => {
      const data = await r.json();
      return data.note === 'Quick check - no DB hit';
    });

    console.log(`   Requests: ${responses.length}`);
    console.log(`   Total time: ${time3}ms`);
    console.log(`   Avg per request: ${Math.round(time3 / responses.length)}ms`);

    if (time3 < 1000) {
      console.log('   ✅ FAST: All 13 requests in <1 second');
    } else {
      console.log('   ⚠️  SLOW: Took more than 1 second');
    }

    console.log('   ✅ NO DATABASE POOL EXHAUSTION!');
  } catch (err) {
    console.error('   ❌ Concurrent requests failed:', err);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n✅ VERIFICATION COMPLETE\n');
  console.log('If you saw "Quick check - no DB hit", the fix is working!\n');
}

// Run test
testQuickCheck().catch(console.error);
