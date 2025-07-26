import { getSession } from "auth/server";
import { McpServerSchema } from "lib/db/pg/schema.pg";
import { NextResponse } from "next/server";
import { saveMcpClientAction } from "./actions";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = (await request.json()) as typeof McpServerSchema.$inferInsert;

  try {
    await saveMcpClientAction(json);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save MCP client" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
