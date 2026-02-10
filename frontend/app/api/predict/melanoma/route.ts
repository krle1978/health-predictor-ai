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

  const backendUrl = `${base.replace(/\/$/, "")}/predict/melanoma`
  const contentType = req.headers.get("content-type") || ""

  let res: Response | null = null
  const body = await req.arrayBuffer()

  let lastErr: any = null
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      res = await fetch(backendUrl, {
        method: "POST",
        headers: contentType ? { "content-type": contentType } : undefined,
        body,
        cache: "no-store",
      })
      lastErr = null
      break
    } catch (err: any) {
      lastErr = err
      // Backend might still be booting (TensorFlow model load); brief retry.
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  if (lastErr || !res) {
    return NextResponse.json(
      { error: "Backend unreachable", backendUrl, details: lastErr?.message || String(lastErr) },
      { status: 502 }
    )
  }

  const text = await res.text()
  try {
    const data = JSON.parse(text)
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      {
        error: "Invalid response from backend",
        backendUrl,
        status: res.status,
        body: text ? text.slice(0, 2000) : "",
      },
      { status: res.status || 500 }
    )
  }
}
