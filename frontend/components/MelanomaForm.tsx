"use client"
import { useState } from "react"

export default function MelanomaForm() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const submit = async () => {
    if (!file) return
    setLoading(true); setResult(null)
    const fd = new FormData()
    fd.append("image", file)
    try {
      const res = await fetch("/api/predict/melanoma", { method: "POST", body: fd })
      const data = await res.json()
      setResult(data)
    } catch (e:any) {
      setResult({ error: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-3">
      <input 
        type="file" 
        accept="image/*" 
        aria-label="Upload skin mole photo"
        onChange={(e)=> setFile(e.target.files?.[0] ?? null)}
        className="border rounded-lg px-3 py-2"
      />

      <button onClick={submit} disabled={!file || loading}
              className="bg-brandCyan text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
        {loading ? "Uploading..." : "Predict"}
      </button>
      {result?.error && <p className="text-red-600">Error: {result.error}</p>}
      {result?.prediction && (
        <p className="font-medium">
          Result: {result.prediction} {typeof result.confidence==="number" && `(${(result.confidence*100).toFixed(2)}%)`}
        </p>
      )}
    </div>
  )
}
