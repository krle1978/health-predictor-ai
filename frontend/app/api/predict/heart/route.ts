import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getApiBase() {
  return process.env.API_BASE ?? process.env.NEXT_PUBLIC_API_BASE ?? null
}

export async function POST(req: Request) {
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

  const body = await req.json()
  const backendUrl = `${base.replace(/\/$/, "")}/predict/heart`

  try {
    const res = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })

    const text = await res.text()
    try {
      return NextResponse.json(JSON.parse(text), { status: res.status })
    } catch {
      return NextResponse.json(
        { error: "Invalid response from backend", backendUrl, status: res.status, body: text.slice(0, 2000) },
        { status: 502 }
      )
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: "Backend unreachable", backendUrl, details: err?.message || String(err) },
      { status: 502 }
    )
  }
}
