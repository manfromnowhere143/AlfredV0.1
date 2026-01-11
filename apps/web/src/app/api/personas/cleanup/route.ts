import { NextResponse } from "next/server";
import { db, eq, sessions } from "@alfred/database";
import * as schema from "@alfred/database";
import { sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * DELETE /api/personas/cleanup
 *
 * Safely removes personas that don't have images.
 * Only affects the authenticated user's personas.
 * NEVER deletes personas that have images.
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // First, get count of personas to delete (for logging)
    const toDelete = await db
      .select({ id: schema.personas.id, name: schema.personas.name })
      .from(schema.personas)
      .where(
        sql`${schema.personas.userId} = ${userId} AND (${schema.personas.primaryImageUrl} IS NULL OR ${schema.personas.primaryImageUrl} = '')`
      );

    console.log(`[Cleanup] Found ${toDelete.length} personas without images to delete for user ${userId}`);
    console.log(`[Cleanup] Personas to delete:`, toDelete.map(p => p.name));

    if (toDelete.length === 0) {
      return NextResponse.json({
        message: "No personas without images found",
        deleted: 0
      });
    }

    // Delete personas without images
    const result = await db
      .delete(schema.personas)
      .where(
        sql`${schema.personas.userId} = ${userId} AND (${schema.personas.primaryImageUrl} IS NULL OR ${schema.personas.primaryImageUrl} = '')`
      )
      .returning({ id: schema.personas.id, name: schema.personas.name });

    console.log(`[Cleanup] Successfully deleted ${result.length} personas`);

    return NextResponse.json({
      message: `Deleted ${result.length} personas without images`,
      deleted: result.length,
      deletedPersonas: result.map(p => p.name),
    });
  } catch (error) {
    console.error("[Cleanup] Error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup personas" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/personas/cleanup
 *
 * Preview what would be deleted (dry run)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get personas without images
    const withoutImages = await db
      .select({ id: schema.personas.id, name: schema.personas.name })
      .from(schema.personas)
      .where(
        sql`${schema.personas.userId} = ${userId} AND (${schema.personas.primaryImageUrl} IS NULL OR ${schema.personas.primaryImageUrl} = '')`
      );

    // Get personas with images (safe)
    const withImages = await db
      .select({ id: schema.personas.id, name: schema.personas.name })
      .from(schema.personas)
      .where(
        sql`${schema.personas.userId} = ${userId} AND ${schema.personas.primaryImageUrl} IS NOT NULL AND ${schema.personas.primaryImageUrl} != ''`
      );

    return NextResponse.json({
      preview: true,
      toDelete: withoutImages.length,
      toKeep: withImages.length,
      personasToDelete: withoutImages.map(p => p.name),
      personasToKeep: withImages.map(p => p.name),
    });
  } catch (error) {
    console.error("[Cleanup Preview] Error:", error);
    return NextResponse.json(
      { error: "Failed to preview cleanup" },
      { status: 500 }
    );
  }
}
