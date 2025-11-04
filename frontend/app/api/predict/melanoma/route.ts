export const runtime = "nodejs"

export async function POST(req: Request) {
  const base = process.env.NEXT_PUBLIC_API_BASE!
  const form = await req.formData()
  const res = await fetch(`${base}/predict/melanoma`, { method: "POST", body: form, cache: "no-store" })
  const data = await res.json()
  return new Response(JSON.stringify(data), { status: res.status, headers: { "Content-Type": "application/json" } })
}
