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
    slope: "",
  });

  const [result, setResult] = useState<{ prediction: string; confidence: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setErrorMessage(null);

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

    for (const [key, value] of Object.entries(payload)) {
      if (!Number.isFinite(value)) {
        setErrorMessage(`Missing or invalid value for: ${key}`);
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch(`/api/predict/heart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Prediction failed");
        return;
      }

      setResult(data);
    } catch (error) {
      console.error("Heart prediction request failed:", error);
      setErrorMessage("Prediction request failed. Please try again.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full flex flex-col justify-center items-center">
      <div className="w-full bg-white rounded-2xl shadow-lg p-8 border border-brandCyan/40">
        <h2 className="text-2xl font-semibold text-brandBlue mb-6">Prediction of Heart Disease</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <select name="age" value={formData.age} onChange={handleChange} required className="input">
              <option value="">Age Group</option>
              <option value="35">Under 40 years</option>
              <option value="45">40-49 years</option>
              <option value="55">50-59 years</option>
              <option value="65">60-69 years</option>
              <option value="75">70+ years</option>
            </select>

            <select name="sex" value={formData.sex} onChange={handleChange} required className="input">
              <option value="">Sex</option>
              <option value="1">Male</option>
              <option value="0">Female</option>
            </select>

            <select name="cp" value={formData.cp} onChange={handleChange} required className="input">
              <option value="">Chest Pain Type</option>
              <option value="0">Typical angina (with exertion)</option>
              <option value="1">Atypical angina</option>
              <option value="2">Non-anginal pain</option>
              <option value="3">Asymptomatic (no chest pain)</option>
            </select>

            <select name="thalach" value={formData.thalach} onChange={handleChange} required className="input">
              <option value="">Max Heart Rate Group</option>
              <option value="110">Below 120 bpm</option>
              <option value="130">120-139 bpm</option>
              <option value="150">140-159 bpm</option>
              <option value="170">160-179 bpm</option>
              <option value="185">180+ bpm</option>
            </select>

            <select name="ca" value={formData.ca} onChange={handleChange} required className="input">
              <option value="">Major Vessels (Fluoroscopy)</option>
              <option value="0">0 - None highlighted</option>
              <option value="1">1 - One vessel highlighted</option>
              <option value="2">2 - Two vessels highlighted</option>
              <option value="3">3 - Three vessels highlighted</option>
            </select>

            <select name="oldpeak" value={formData.oldpeak} onChange={handleChange} required className="input">
              <option value="">ST Depression (Oldpeak)</option>
              <option value="0">0.0 - None</option>
              <option value="0.5">0.1-0.9 - Mild</option>
              <option value="1.5">1.0-1.9 - Moderate</option>
              <option value="2.5">2.0-2.9 - High</option>
              <option value="3.5">3.0+ - Very high</option>
            </select>

            <select name="thal" value={formData.thal} onChange={handleChange} required className="input">
              <option value="">Thalassemia Test</option>
              <option value="1">1 - Normal</option>
              <option value="2">2 - Fixed defect</option>
              <option value="3">3 - Reversible defect</option>
            </select>

            <select name="slope" value={formData.slope} onChange={handleChange} required className="input">
              <option value="">Slope</option>
              <option value="0">0 - Upsloping</option>
              <option value="1">1 - Flat</option>
              <option value="2">2 - Downsloping</option>
            </select>
          </div>

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

        <details className="mt-6 text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
          <summary className="cursor-pointer font-semibold text-brandBlue">Instructions (click to expand)</summary>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li><b>age:</b> Choose your age range. The app maps it to a representative value (35, 45, 55, 65, 75).</li>
            <li><b>sex:</b> 1 = Male, 0 = Female.</li>
            <li><b>cp (chest pain type):</b> 0 = Typical angina, 1 = Atypical angina, 2 = Non-anginal pain, 3 = Asymptomatic.</li>
            <li><b>thalach:</b> Maximum heart rate reached during activity/test. Pick the closest bpm group.</li>
            <li><b>ca:</b> Number of major vessels highlighted by fluoroscopy: 0, 1, 2, or 3.</li>
            <li><b>oldpeak:</b> ST depression (exercise vs rest ECG): 0.0 none, 0.1-0.9 mild, 1.0-1.9 moderate, 2.0-2.9 high, 3.0+ very high.</li>
            <li><b>thal:</b> Thalassemia test result: 1 normal, 2 fixed defect, 3 reversible defect.</li>
            <li><b>slope:</b> Slope of peak exercise ST segment: 0 upsloping, 1 flat, 2 downsloping.</li>
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
                {result.prediction === "Positive" ? "High Risk of Heart Disease" : "No Significant Heart Risk"}
              </p>
              <p className="text-2xl font-bold mt-2">Confidence: {(result.confidence * 100).toFixed(1)}%</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
