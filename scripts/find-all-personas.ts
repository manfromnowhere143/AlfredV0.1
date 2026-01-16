/**
 * Find ALL personas in database (regardless of user)
 */

import { db } from "@alfred/database";
import * as schema from "@alfred/database";

async function main() {
  console.log("\n🔍 SEARCHING FOR ALL PERSONAS IN DATABASE\n");
  console.log("═".repeat(80));

  try {
    // Get ALL users
    console.log("\n👥 ALL USERS:");
    const users = await db.select().from(schema.users);
    console.log(`Found ${users.length} users\n`);

    for (const user of users) {
      console.log(`  User: ${user.id}`);
      console.log(`  Email: ${user.email || "(no email)"}`);
      console.log(`  Name: ${user.name || "(no name)"}`);
      console.log();
    }

    // Get ALL personas (regardless of user)
    console.log("\n" + "═".repeat(80));
    console.log("\n🎭 ALL PERSONAS:");
    const personas = await db.select().from(schema.personas);
    console.log(`Found ${personas.length} total personas\n`);

    if (personas.length === 0) {
      console.log("❌ NO PERSONAS FOUND IN DATABASE!");
      console.log("\nThis means either:");
      console.log("  1. Database was reset/cleared");
      console.log("  2. Personas were in a different database");
      console.log("  3. Table name changed");
      console.log("\nCheck your Supabase dashboard to verify.\n");
      process.exit(0);
    }

    // Group by user
    const byUser = new Map<string, any[]>();
    for (const persona of personas) {
      const userId = persona.userId;
      if (!byUser.has(userId)) {
        byUser.set(userId, []);
      }
      byUser.get(userId)!.push(persona);
    }

    // Show personas by user
    for (const [userId, userPersonas] of byUser.entries()) {
      const user = users.find(u => u.id === userId);
      console.log(`\n📦 User: ${user?.name || userId}`);
      console.log(`   Email: ${user?.email || "(no email)"}`);
      console.log(`   Personas: ${userPersonas.length}`);
      console.log();

      for (const persona of userPersonas) {
        console.log(`   🎭 ${persona.name} (${persona.archetype})`);
        console.log(`      ID: ${persona.id}`);

        if ((persona as any).idleVideoUrl) {
          const url = (persona as any).idleVideoUrl;
          if (url.startsWith("http")) {
            console.log(`      ✅ IDLE VIDEO: ${url.slice(0, 80)}...`);
          } else {
            console.log(`      ⚠️  Image only (base64, ${url.length} chars)`);
          }
        } else {
          console.log(`      ❌ No idle video`);
        }

        if ((persona as any).primaryImageUrl) {
          const img = (persona as any).primaryImageUrl;
          if (img.startsWith("http")) {
            console.log(`      🖼️  Primary: ${img.slice(0, 60)}...`);
          } else {
            console.log(`      🖼️  Primary: base64 (${img.length} chars)`);
          }
        }

        console.log();
      }
    }

    console.log("\n" + "═".repeat(80));
    console.log(`\n✅ Total: ${personas.length} personas across ${byUser.size} users\n`);

    // Show the user that should be logged in
    if (byUser.size > 0) {
      const mainUserId = Array.from(byUser.keys())[0];
      const mainUser = users.find(u => u.id === mainUserId);
      console.log(`\n💡 To see these personas, log in as:`);
      console.log(`   Email: ${mainUser?.email || "(check Supabase)"}`);
      console.log(`   User ID: ${mainUserId}\n`);
    }

  } catch (err) {
    console.error("\n❌ Error:", err);
    process.exit(1);
  }

  process.exit(0);
}

main();
