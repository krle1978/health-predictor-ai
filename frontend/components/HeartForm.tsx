"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export default function HeartForm() {
  const [formData, setFormData] = useState({
    age: "",
    sex: "",
    cp: "",
    thalach: "",
    ca: "",
    oldpeak: "",
    thal: "",
    slope: ""
  })

  const [result, setResult] = useState<{ prediction: string; confidence: number } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/predict/heart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Prediction failed")

      setResult({
        prediction: data.prediction,
        confidence: data.confidence
      })
    } catch (error) {
      console.error(error)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative w-full flex flex-col justify-center items-center">
      <div className="w-full bg-white rounded-2xl shadow-lg p-8 border border-brandCyan/40">
        <h2 className="text-2xl font-semibold text-brandBlue mb-6 flex items-center gap-2">
          ❤️ Heart Disease Prediction
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <input
              name="age"
              type="number"
              placeholder="Age"
              value={formData.age}
              onChange={handleChange}
              className="input"
            />

            <select name="sex" value={formData.sex} onChange={handleChange} className="input" title="Sex">
              <option value="">Sex</option>
              <option value="1">Male</option>
              <option value="0">Female</option>
            </select>

            <select name="cp" value={formData.cp} onChange={handleChange} className="input" title="Chest Pain Type">
              <option value="">Chest Pain Type</option>
              <option value="0">Typical Angina</option>
              <option value="1">Atypical Angina</option>
              <option value="2">Non-Anginal Pain</option>
              <option value="3">Asymptomatic</option>
            </select>

            <input
              name="thalach"
              type="number"
              placeholder="Max Heart Rate"
              value={formData.thalach}
              onChange={handleChange}
              className="input"
            />

            <input
              name="ca"
              type="number"
              placeholder="Major Vessels (0–3)"
              value={formData.ca}
              onChange={handleChange}
              className="input"
            />

            <input
              name="oldpeak"
              type="number"
              step="0.1"
              placeholder="ST Depression (Oldpeak)"
              value={formData.oldpeak}
              onChange={handleChange}
              className="input"
            />

            <select name="thal" value={formData.thal} onChange={handleChange} className="input" title="Thalassemia">
              <option value="">Thalassemia Test</option>
              <option value="1">Normal</option>
              <option value="2">Fixed Defect</option>
              <option value="3">Reversible Defect</option>
            </select>

            <select name="slope" value={formData.slope} onChange={handleChange} className="input" title="Slope">
              <option value="">Slope</option>
              <option value="0">Upsloping</option>
              <option value="1">Flat</option>
              <option value="2">Downsloping</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-brandCyan hover:bg-brandCyan/90 text-white font-semibold rounded-lg transition-all"
          >
            {loading ? "Predicting..." : "Predict"}
          </button>
        </form>

        {/* 💠 Result Card */}
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
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut"
                }}
              >
                {result.prediction === "Positive"
                  ? "⚠️ High Risk of Heart Disease"
                  : "✅ No Significant Heart Risk"}
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
