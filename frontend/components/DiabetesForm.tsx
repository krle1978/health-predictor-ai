"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export default function PredictionOfDiabetes() {
  const [formData, setFormData] = useState({
    HighChol: "",
    Smoker: "",
    HeartDiseaseorAttack: "",
    Height: "",
    Weight: "",
    BMI: "",
    PhysActivity: "",
    GenHlth: "",
    PhysHlth: "",
    DiffWalk: "",
    Age: ""
  })

  const [result, setResult] = useState<{ prediction: string; confidence: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 🧮 BMI calculation
  const height = parseFloat(formData.Height)
  const weight = parseFloat(formData.Weight)
  const bmi = height && weight ? +(weight / Math.pow(height / 100, 2)).toFixed(1) : 0

  const bmiColor =
    bmi < 18.5 ? "text-blue-500" :
    bmi < 25 ? "text-green-600" :
    bmi < 30 ? "text-yellow-600" :
    "text-red-600"

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setErrorMessage(null)

    try {
      const payload = {
        HighChol: formData.HighChol,
        BMI: bmi,
        Smoker: formData.Smoker,
        HeartDiseaseorAttack: formData.HeartDiseaseorAttack,
        PhysActivity: formData.PhysActivity,
        GenHlth: formData.GenHlth,
        PhysHlth: formData.PhysHlth,
        DiffWalk: formData.DiffWalk,
        Age: formData.Age
      }

      const res = await fetch(`/api/predict/diabetes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMessage(data.error || "Prediction failed")
        return
      }

      setResult({ prediction: data.prediction, confidence: data.confidence })
    } catch (error) {
      console.error("Diabetes prediction request failed:", error)
      setErrorMessage("Prediction request failed. Please try again.")
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative w-full flex flex-col justify-center items-center">
      <div className="w-full bg-white rounded-2xl shadow-lg p-8 border border-brandCyan/40">
        <h2 className="text-2xl font-semibold text-brandBlue mb-6">
          Prediction of Diabetes
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <select name="HighChol" value={formData.HighChol} onChange={handleChange} className="input">
              <option value="">High Cholesterol?</option>
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>

            <select name="Smoker" value={formData.Smoker} onChange={handleChange} className="input">
              <option value="">Smoker?</option>
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>

            <select name="HeartDiseaseorAttack" value={formData.HeartDiseaseorAttack} onChange={handleChange} className="input">
              <option value="">Heart Disease or Attack?</option>
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input name="Height" type="number" placeholder="Height (cm)" value={formData.Height} onChange={handleChange} className="input" />
            <input name="Weight" type="number" placeholder="Weight (kg)" value={formData.Weight} onChange={handleChange} className="input" />
          </div>

          {bmi > 0 && (
            <p className={`font-semibold text-lg ${bmiColor}`}>BMI: {bmi}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <select name="PhysActivity" value={formData.PhysActivity} onChange={handleChange} className="input">
              <option value="">Physical Activity?</option>
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>

            <select name="GenHlth" value={formData.GenHlth} onChange={handleChange} className="input">
              <option value="">General Health</option>
              <option value="1">Excellent</option>
              <option value="2">Very Good</option>
              <option value="3">Good</option>
              <option value="4">Fair</option>
              <option value="5">Poor</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input name="PhysHlth" type="number" placeholder="Physical Health (0–30 days)" value={formData.PhysHlth} onChange={handleChange} className="input" />
            <select name="DiffWalk" value={formData.DiffWalk} onChange={handleChange} className="input">
              <option value="">Difficulty Walking?</option>
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </div>

          <input name="Age" type="number" placeholder="Age" value={formData.Age} onChange={handleChange} className="input" />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-brandCyan hover:bg-brandCyan/90 text-white font-semibold rounded-lg transition-all"
          >
            {loading ? "Predicting..." : "Predict"}
          </button>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
        </form>

        <details className="mt-6 cursor-pointer text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
          <summary className="font-semibold text-brandBlue">🛈 Instructions (click to expand)</summary>
          <ul className="mt-3 list-disc pl-6 space-y-1">
            <li><b>HighChol:</b> 0 = No, 1 = Yes — High cholesterol diagnosis.</li>
            <li><b>Smoker:</b> 0 = No, 1 = Yes — Smoking status.</li>
            <li><b>HeartDiseaseorAttack:</b> 0 = No, 1 = Yes — Heart disease history.</li>
            <li><b>Height / Weight:</b> Height in cm, Weight in kg — Used to compute BMI.</li>
            <li><b>BMI:</b> Computed automatically; 18.5–24.9 is healthy.</li>
            <li><b>PhysActivity:</b> 0 = No, 1 = Yes — Regular physical activity.</li>
            <li><b>GenHlth:</b> 1 = Excellent → 5 = Poor — General health rating.</li>
            <li><b>PhysHlth:</b> 0–30 days — Days of poor physical health last month.</li>
            <li><b>DiffWalk:</b> 0 = No, 1 = Yes — Walking difficulties.</li>
            <li><b>Age:</b> in years (integer).</li>
          </ul>
        </details>

        <AnimatePresence>
          {result && (
            <motion.div
              key="result-card"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`mt-6 rounded-xl p-6 shadow-lg text-center font-semibold ${
                result.prediction === "Positive"
                  ? "bg-red-100 text-red-700 border border-red-300"
                  : "bg-green-100 text-green-700 border border-green-300"
              }`}
            >
              <motion.p
                className="text-xl"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1.05 }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              >
                {result.prediction === "Positive" ? "⚠️ Diabetes Risk Detected" : "✅ No Diabetes Risk"}
              </motion.p>
              <motion.p
                className="text-2xl font-bold mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Confidence: {(result.confidence * 100).toFixed(1)}%
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
