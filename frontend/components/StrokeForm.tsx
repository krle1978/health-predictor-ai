"use client"
import { useState } from "react"

export default function StrokeForm() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    Age: "", Hypertension: "", HeartDisease: "", AvgGlucoseLevel: "", BMI: ""
  })
  const handle = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const submit = async () => {
    setLoading(true); setResult(null)
    try {
      const res = await fetch("/api/predict/stroke", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(form)
      })
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.keys(form).map((k) => (
          <input key={k} name={k} placeholder={k}
                 value={(form as any)[k]} onChange={handle}
                 className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brandCyan"/>
        ))}
      </div>
      <button onClick={submit} className="bg-brandCyan text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
              disabled={loading}>
        {loading ? "Checking..." : "Send (placeholder)"}
      </button>
      {result?.error && <p className="text-red-600">Error: {result.error}</p>}
      {result?.message && (
        <p className="font-medium">{result.message}</p>
      )}
    </div>
  )
}
