export const runtime = "nodejs" // potrebno za fetch sa form-data/JSON

export async function POST(req: Request) {
  const base = process.env.NEXT_PUBLIC_API_BASE!
  const body = await req.json()
  const res = await fetch(`${base}/predict/diabetes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), { status: res.status, headers: { "Content-Type": "application/json" } })
}
