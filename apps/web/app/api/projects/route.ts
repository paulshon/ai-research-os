import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "https://sarangred-ai-research-os-api.hf.space";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspace_id") || "";

  try {
    const url = workspaceId
      ? `${API_URL}/projects?workspace_id=${workspaceId}`
      : `${API_URL}/projects`;
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Projects API 연결 실패" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await fetch(`${API_URL}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Projects API 연결 실패" }, { status: 500 });
  }
}
