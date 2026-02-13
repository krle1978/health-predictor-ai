"use client"
import { useState } from "react"

export default function PredictionOfMelanoma() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const submit = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    const fd = new FormData()
    fd.append("image", file)
    try {
      const res = await fetch("/api/predict/melanoma", { method: "POST", body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
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
        Prediction of Melanoma
      </h2>

      <input
        type="file"
        accept="image/*"
        aria-label="Upload skin mole photo"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="border rounded-lg px-3 py-2"
      />

      <button
        onClick={submit}
        disabled={!file || loading}
        className="bg-brandCyan text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Predict"}
      </button>

      <details className="mt-4 text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
        <summary className="cursor-pointer font-semibold text-brandBlue">
          🛈 Instructions (click to expand)
        </summary>
        <ul className="mt-2 list-disc pl-6 space-y-1">
          <li>Upload a <b>clear, well-lit photo</b> of the mole or skin lesion.</li>
          <li>The image should be in formats such as <b>.jpg</b>, <b>.jpeg</b>, or <b>.png</b>.</li>
          <li>Ensure the mole is centered and occupies most of the frame.</li>
          <li>The prediction will classify the mole as <b>Benign</b> or <b>Malignant</b>.</li>
        </ul>
      </details>

      {result?.error && <p className="text-red-600">Error: {result.error}</p>}
      {result?.prediction && (
        <div className="font-medium mt-4 grid gap-1">
          <p>
            Result: {result.prediction}{" "}
            {typeof result.confidence === "number" &&
              `(${(result.confidence * 100).toFixed(2)}%)`}{" "}
            <span className="text-sm text-gray-700">
              - final Benign/Malignant decision with confidence score.
            </span>
          </p>
          {typeof result.melanoma_prob === "number" && (
            <p className="text-sm text-gray-700">
              MEL probability: {(result.melanoma_prob * 100).toFixed(2)}% - estimated probability that this lesion is melanoma (MEL class).
            </p>
          )}
          {typeof result.top_class === "string" && typeof result.top_confidence === "number" && (
            <p className="text-sm text-gray-700">
              Top class: {result.top_class} ({(result.top_confidence * 100).toFixed(2)}%) - most likely detailed skin-lesion class predicted by the model.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
