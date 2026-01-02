import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { projects } from "@alfred/database";
import { eq, desc, isNull, and } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await getDb();
    
    // Fetch all projects with Vercel deployments for this user
    const userProjects = await client.db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.userId, session.user.id),
          isNull(projects.deletedAt)
        )
      )
      .orderBy(desc(projects.lastDeployedAt));

    return NextResponse.json({ projects: userProjects });
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

