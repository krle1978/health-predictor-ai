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

  const backendUrl = `${base.replace(/\/$/, "")}/predict/heart`

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
  }

  // hard timeout so YOU control the failure mode (instead of random proxy timing out)
  const controller = new AbortController()
  const timeoutMs = Number(process.env.PREDICT_TIMEOUT_MS ?? 55000) // 55s default
  const t = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    })

    const contentType = res.headers.get("content-type") || ""
    const text = await res.text()

    // If backend did not return JSON, normalize to JSON error for the frontend.
    const isJsonLike =
      contentType.includes("application/json") || text.trim().startsWith("{") || text.trim().startsWith("[")

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "Backend responded with an error",
          backendUrl,
          status: res.status,
          backendContentType: contentType,
          backendBodyPreview: text.slice(0, 2000),
        },
        { status: 502 }
      )
    }

    if (!isJsonLike) {
      return NextResponse.json(
        {
          error: "Backend returned non-JSON response",
          backendUrl,
          status: res.status,
          backendContentType: contentType,
          backendBodyPreview: text.slice(0, 2000),
        },
        { status: 502 }
      )
    }

    try {
      return NextResponse.json(JSON.parse(text), { status: 200 })
    } catch {
      return NextResponse.json(
        {
          error: "Backend returned invalid JSON",
          backendUrl,
          status: res.status,
          backendContentType: contentType,
          backendBodyPreview: text.slice(0, 2000),
        },
        { status: 502 }
      )
    }
  } catch (err: any) {
    const isAbort = err?.name === "AbortError"
    return NextResponse.json(
      {
        error: isAbort ? "Backend request timed out" : "Backend unreachable",
        backendUrl,
        timeoutMs,
        details: err?.message || String(err),
      },
      { status: 504 }
    )
  } finally {
    clearTimeout(t)
  }
}
