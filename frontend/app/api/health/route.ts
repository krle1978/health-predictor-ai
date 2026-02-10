import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getApiBase() {
  return process.env.API_BASE ?? process.env.NEXT_PUBLIC_API_BASE ?? null
}

export async function GET() {
  const base = getApiBase()
  if (!base) {
    return NextResponse.json(
      {
        error: "API_BASE is not set",
        hint:
          "Set API_BASE in Vercel Environment Variables (or add API_BASE=http://127.0.0.1:8000 to frontend/.env.local for local dev).",
      },
      { status: 500 }
    )
  }

  const backendUrl = `${base.replace(/\/$/, "")}/health`
  try {
    const res = await fetch(backendUrl, { method: "GET", cache: "no-store" })
    const text = await res.text().catch(() => "")

    if (!res.ok) {
      return NextResponse.json(
        { error: "Backend not ready", status: res.status, body: text ? text.slice(0, 2000) : "" },
        { status: res.status }
      )
    }

    // Backend might return plain text; pass through as JSON-ish status.
    return NextResponse.json({ ok: true, status: res.status, body: text }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { error: "Backend unreachable", backendUrl, details: err?.message || String(err) },
      { status: 502 }
    )
  }
}
