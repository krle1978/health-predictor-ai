"use client"
import { useState } from "react"

export default function PredictionOfStroke() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    Age: "",
    Hypertension: "",
    HeartDisease: "",
    AvgGlucoseLevel: "",
    BMI: ""
  })

  const handle = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const submit = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/predict/stroke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      setResult(data)
    } catch (e: any) {
      setResult({ error: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-3">
      <h2 className="text-2xl font-semibold text-brandBlue mb-4">
        Prediction of Stroke
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.keys(form).map((k) => (
          <input
            key={k}
            name={k}
            placeholder={k}
            value={(form as any)[k]}
            onChange={handle}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brandCyan"
          />
        ))}
      </div>

      <button
        onClick={submit}
        className="bg-brandCyan text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Checking..." : "Predict"}
      </button>

      <details className="mt-4 text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
        <summary className="cursor-pointer font-semibold text-brandBlue">
          🛈 Instructions (click to expand)
        </summary>
        <ul className="mt-2 list-disc pl-6 space-y-1">
          <li><b>Age:</b> Age in years (integer).</li>
          <li><b>Hypertension:</b> 0 = No, 1 = Yes — History of high blood pressure.</li>
          <li><b>HeartDisease:</b> 0 = No, 1 = Yes — Presence of heart disease.</li>
          <li><b>AvgGlucoseLevel:</b> Average blood glucose level in mg/dL (e.g., 105).</li>
          <li><b>BMI:</b> Body Mass Index (18.5–24.9 is normal).</li>
        </ul>
      </details>

      {result?.error && <p className="text-red-600">Error: {result.error}</p>}
      {result?.message && <p className="font-medium mt-4">{result.message}</p>}
    </div>
  )
}
