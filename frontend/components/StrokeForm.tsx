"use client"

import { useState } from "react"

type StrokeResult = {
  prediction: string
  confidence: number
  message?: string
}

export default function PredictionOfStroke() {
  const [result, setResult] = useState<StrokeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    age: "",
    systolic: "",
    diastolic: "",
    fastingGlucose: "",
    glycohemoglobin: "",
    ldl: "",
    hdl: "",
    triglyceride: "",
  })

  const handle = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const submit = async () => {
    setLoading(true)
    setResult(null)
    setError(null)

    const payload = {
      age: Number(form.age),
      "Systolic blood pressure": Number(form.systolic),
      "Diastolic blood pressure": Number(form.diastolic),
      "Fasting Glucose": Number(form.fastingGlucose),
      Glycohemoglobin: Number(form.glycohemoglobin),
      "Low-density lipoprotein": Number(form.ldl),
      "High-density lipoprotein": Number(form.hdl),
      Triglyceride: Number(form.triglyceride),
    }

    for (const [key, value] of Object.entries(payload)) {
      if (!Number.isFinite(value)) {
        setError(`Missing or invalid value for: ${key}`)
        setLoading(false)
        return
      }
    }

    try {
      const res = await fetch("/api/predict/stroke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Prediction failed")
        return
      }
      setResult(data)
    } catch (e: any) {
      setError(e?.message || "Prediction request failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-3">
      <h2 className="text-2xl font-semibold text-brandBlue mb-4">Prediction of Stroke</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <input
          name="age"
          placeholder="Age"
          value={form.age}
          onChange={handle}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brandCyan"
        />
        <input
          name="systolic"
          placeholder="Systolic blood pressure"
          value={form.systolic}
          onChange={handle}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brandCyan"
        />
        <input
          name="diastolic"
          placeholder="Diastolic blood pressure"
          value={form.diastolic}
          onChange={handle}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brandCyan"
        />
        <input
          name="fastingGlucose"
          placeholder="Fasting Glucose"
          value={form.fastingGlucose}
          onChange={handle}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brandCyan"
        />
        <input
          name="glycohemoglobin"
          placeholder="Glycohemoglobin"
          value={form.glycohemoglobin}
          onChange={handle}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brandCyan"
        />
        <input
          name="ldl"
          placeholder="Low-density lipoprotein"
          value={form.ldl}
          onChange={handle}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brandCyan"
        />
        <input
          name="hdl"
          placeholder="High-density lipoprotein"
          value={form.hdl}
          onChange={handle}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brandCyan"
        />
        <input
          name="triglyceride"
          placeholder="Triglyceride"
          value={form.triglyceride}
          onChange={handle}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brandCyan"
        />
      </div>

      <button
        onClick={submit}
        className="bg-brandCyan text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Checking..." : "Predict"}
      </button>

      <details className="mt-4 text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
        <summary className="cursor-pointer font-semibold text-brandBlue">Instructions (click to expand)</summary>
        <ul className="mt-2 list-disc pl-6 space-y-1">
          <li><b>age:</b> Age in years.</li>
          <li><b>Systolic blood pressure:</b> Upper blood pressure value (mmHg).</li>
          <li><b>Diastolic blood pressure:</b> Lower blood pressure value (mmHg).</li>
          <li><b>Fasting Glucose:</b> Fasting blood glucose (mg/dL): normal 70-99, prediabetes 100-125, diabetes 126+.</li>
          <li><b>Glycohemoglobin:</b> HbA1c percentage: normal under 5.7%, prediabetes 5.7-6.4%, diabetes 6.5%+.</li>
          <li><b>Low-density lipoprotein:</b> LDL cholesterol (mg/dL): optimal under 100, borderline 130-159, high 160+.</li>
          <li><b>High-density lipoprotein:</b> HDL cholesterol (mg/dL): low under 40, acceptable 40-59, protective 60+.</li>
          <li><b>Triglyceride:</b> Triglyceride level (mg/dL): normal under 150, borderline 150-199, high 200+.</li>
        </ul>
      </details>

      {error && <p className="text-red-600">Error: {error}</p>}
      {result && (
        <div className={`mt-4 rounded-lg border p-4 ${result.prediction === "Positive" ? "border-red-300 bg-red-100 text-red-700" : "border-green-300 bg-green-100 text-green-700"}`}>
          <p className="font-semibold">{result.message || result.prediction}</p>
          <p>Confidence: {(result.confidence * 100).toFixed(1)}%</p>
        </div>
      )}
    </div>
  )
}
