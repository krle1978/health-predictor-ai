"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PredictionOfHeartDisease() {
  const [formData, setFormData] = useState({
    age: "",
    sex: "",
    cp: "",
    thalach: "",
    ca: "",
    oldpeak: "",
    thal: "",
    slope: ""
  });

  const [result, setResult] = useState<{ prediction: string; confidence: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const payload = {
      age: Number(formData.age),
      sex: Number(formData.sex),
      cp: Number(formData.cp),
      thalach: Number(formData.thalach),
      ca: Number(formData.ca),
      oldpeak: Number(formData.oldpeak),
      thal: Number(formData.thal),
      slope: Number(formData.slope),
    };

    // ✅ Validacija inputa pre slanja
    for (const key in payload) {
      if (isNaN(payload[key])) {
        alert(`Missing or invalid value for: ${key}`);
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/predict/heart`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Prediction failed");

      setResult(data);
    } catch (error) {
      console.error(error);
      alert("Server error — check browser console.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full flex flex-col justify-center items-center">
      <div className="w-full bg-white rounded-2xl shadow-lg p-8 border border-brandCyan/40">
        <h2 className="text-2xl font-semibold text-brandBlue mb-6">
          Prediction of Heart Disease
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <input name="age" type="number" placeholder="Age"
              value={formData.age} onChange={handleChange} required className="input" />

            <select name="sex" value={formData.sex} onChange={handleChange} required className="input">
              <option value="">Sex</option>
              <option value="1">Male</option>
              <option value="0">Female</option>
            </select>

            <select name="cp" value={formData.cp} onChange={handleChange} required className="input">
              <option value="">Chest Pain Type</option>
              <option value="0">Typical Angina</option>
              <option value="1">Atypical Angina</option>
              <option value="2">Non-Anginal Pain</option>
              <option value="3">Asymptomatic</option>
            </select>

            <input name="thalach" type="number" placeholder="Max Heart Rate"
              value={formData.thalach} onChange={handleChange} required className="input" />

            <input name="ca" type="number" placeholder="Major Vessels (0–3)"
              value={formData.ca} onChange={handleChange} required className="input" />

            <input name="oldpeak" type="number" step="0.1"
              placeholder="ST Depression (Oldpeak)"
              value={formData.oldpeak} onChange={handleChange} required className="input" />

            <select name="thal" value={formData.thal} onChange={handleChange} required className="input">
              <option value="">Thalassemia Test</option>
              <option value="1">Normal</option>
              <option value="2">Fixed Defect</option>
              <option value="3">Reversible Defect</option>
            </select>

            <select name="slope" value={formData.slope} onChange={handleChange} required className="input">
              <option value="">Slope</option>
              <option value="0">Upsloping</option>
              <option value="1">Flat</option>
              <option value="2">Downsloping</option>
            </select>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 mt-2 bg-brandCyan hover:bg-brandCyan/90 text-white font-semibold rounded-lg transition-all">
            {loading ? "Predicting..." : "Predict"}
          </button>
        </form>

        <details className="mt-6 text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
          <summary className="cursor-pointer font-semibold text-brandBlue">
            🛈 Instructions (click to expand)
          </summary>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li><b>age:</b> Age in years (integer)</li>
            <li><b>sex:</b> 1 = Male, 0 = Female</li>
            <li><b>cp:</b> Chest Pain Type 0–3</li>
            <li><b>thalach:</b> Max HR achieved</li>
            <li><b>ca:</b> Major vessels count (0–3)</li>
            <li><b>oldpeak:</b> ST depression</li>
            <li><b>thal:</b> 1–3 (test result)</li>
            <li><b>slope:</b> 0–2</li>
          </ul>
        </details>

        <AnimatePresence>
          {result && (
            <motion.div
              key="result-card"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`mt-6 rounded-xl p-6 text-center font-semibold ${
                result.prediction === "Positive"
                  ? "bg-red-100 text-red-700 border border-red-300"
                  : "bg-green-100 text-green-700 border border-green-300"
              }`}
            >
              <p className="text-xl">
                {result.prediction === "Positive"
                  ? "⚠️ High Risk of Heart Disease"
                  : "✅ No Significant Heart Risk"}
              </p>
              <p className="text-2xl font-bold mt-2">
                Confidence: {(result.confidence * 100).toFixed(1)}%
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
