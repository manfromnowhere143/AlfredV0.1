/**
 * Check Replicate Job Status
 *
 * Diagnostic tool to check why jobs are stuck
 */

import { db } from "@alfred/database";
import * as schema from "@alfred/database";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

async function main() {
  if (!REPLICATE_API_TOKEN) {
    console.error("❌ REPLICATE_API_TOKEN not found in environment");
    process.exit(1);
  }

  console.log("\n🔍 CHECKING REPLICATE JOBS\n");
  console.log("═".repeat(80));

  try {
    // Get all personas
    const personas = await db.select().from(schema.personas);

    console.log(`\nFound ${personas.length} personas\n`);

    for (const persona of personas) {
      console.log(`\n📦 ${persona.name}`);
      console.log("─".repeat(80));

      if (persona.idleVideoUrl) {
        if (persona.idleVideoUrl.startsWith("http")) {
          console.log(`✅ Has idle video: ${persona.idleVideoUrl.slice(0, 80)}...`);
        } else {
          console.log(`⚠️  Has idle video (base64, ${persona.idleVideoUrl.length} chars)`);
        }
      } else {
        console.log(`❌ No idle video`);
      }

      // Check for any stuck jobs by looking at recent Replicate predictions
      // (You'd need to track job IDs in the database for this to work properly)
      console.log(`   Persona ID: ${persona.id}`);
    }

    // List recent predictions from Replicate
    console.log("\n\n🎬 RECENT REPLICATE PREDICTIONS\n");
    console.log("═".repeat(80));

    const recentPreds = await fetch("https://api.replicate.com/v1/predictions", {
      headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` },
    });

    if (!recentPreds.ok) {
      console.error(`❌ Failed to fetch predictions: ${recentPreds.status}`);
      process.exit(1);
    }

    const predsData = await recentPreds.json();

    if (!predsData.results || predsData.results.length === 0) {
      console.log("No recent predictions found");
    } else {
      for (const pred of predsData.results.slice(0, 10)) {
        console.log(`\n${pred.status === "succeeded" ? "✅" : pred.status === "failed" ? "❌" : "⏳"} ${pred.status.toUpperCase()}`);
        console.log(`   ID: ${pred.id}`);
        console.log(`   Model: ${pred.version.split(":")[0].slice(0, 20)}...`);
        console.log(`   Created: ${pred.created_at}`);

        if (pred.status === "succeeded" && pred.output) {
          console.log(`   Output: ${typeof pred.output === "string" ? pred.output.slice(0, 80) : JSON.stringify(pred.output).slice(0, 80)}...`);
        }

        if (pred.status === "failed" && pred.error) {
          console.log(`   Error: ${pred.error}`);
        }

        if (pred.status === "processing" || pred.status === "starting") {
          const started = new Date(pred.created_at).getTime();
          const elapsed = Date.now() - started;
          console.log(`   ⏱️  Running for ${Math.round(elapsed / 1000)}s`);

          if (elapsed > 120000) {
            console.log(`   ⚠️  STUCK! Running for more than 2 minutes`);
          }
        }
      }
    }

    console.log("\n" + "═".repeat(80));
    console.log("\n✅ Check complete\n");
  } catch (err) {
    console.error("\n❌ Error:", err);
    process.exit(1);
  }

  process.exit(0);
}

main();
