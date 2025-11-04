"use client"

import { useState } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import Navbar from "@/components/Navbar"
import HeartForm from "@/components/HeartForm"
import DiabetesForm from "@/components/DiabetesForm"
import StrokeForm from "@/components/StrokeForm"
import MelanomaForm from "@/components/MelanomaForm"

type View = "home" | "heart" | "diabetes" | "stroke" | "melanoma"

export default function Page() {
  const [view, setView] = useState<View>("home")

  const renderForm = () => {
    switch (view) {
      case "heart": return <HeartForm />
      case "diabetes": return <DiabetesForm />
      case "stroke": return <StrokeForm />
      case "melanoma": return <MelanomaForm />
      default: return null
    }
  }

  const cards = [
    { key: "heart", label: "❤️ Heart" },
    { key: "diabetes", label: "🍬 Diabetes" },
    { key: "stroke", label: "🧠 Stroke" },
    { key: "melanoma", label: "☀️ Melanoma" },
  ] as const

  const visibleCards = () => {
    if (view === "home") return cards
    const filtered = cards.filter(c => c.key !== view)
    return [{ key: "home", label: "🏠 Home" } as const, ...filtered]
  }

  const getImageForView = (view: View) => {
    switch (view) {
      case "heart":
        return "/BackgroundPics/Heart_Confident Cardiologist Scene.png"
      case "diabetes":
        return "/BackgroundPics/Diabetes_Doctor in Diagnostic Lab.png"
      case "stroke":
        return "/BackgroundPics/Stroke_Futuristic_Doctor_Glamour.png"
      case "melanoma":
        return "/BackgroundPics/Melanoma_Dermatology Check-Up Scene.png"
      default:
        return "/BackgroundPics/Admissions_Hospital_Heroine.png"
    }
  }

  return (
    <>
      <Navbar />
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] overflow-hidden relative">
        <div className="w-full max-w-7xl grid md:grid-cols-2 gap-10 items-center">
          
          {/* LEVA STRANA (Desktop) */}
          <div className="flex flex-col items-center justify-center px-4">
            <AnimatePresence mode="wait">
              {view !== "home" && (
                <motion.section
                  key={view}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="w-full max-w-3xl mb-8"
                >
                  <div className="rounded-2xl border border-brandCyan/40 shadow-lg p-6 bg-white">
                    {renderForm()}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Dugmad (desktop prikaz) */}
            <motion.section
              key={`${view}-grid`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="hidden md:grid gap-8 sm:grid-cols-2 md:grid-cols-2 w-full max-w-3xl"
            >
              {visibleCards().map(btn => (
                <motion.button
                  key={btn.key}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setView(btn.key as View)}
                  className={`flex items-center justify-center h-48 rounded-2xl text-xl font-semibold 
                              bg-gradient-to-b from-brandCyan/30 to-brandCyan/10 text-brandBlue 
                              border border-brandCyan/40 hover:from-brandCyan/50 hover:to-brandCyan/20 
                              transition-all duration-300 shadow-lg hover:shadow-xl
                              ${view === btn.key ? "hidden" : ""}`}
                >
                  {btn.label}
                </motion.button>
              ))}
            </motion.section>
          </div>

          {/* DESNA STRANA — Dinamička slika (desktop) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="hidden md:flex justify-center items-center"
            >
              <Image
                src={getImageForView(view)}
                alt="Health Illustration"
                width={650}
                height={500}
                className="rounded-2xl shadow-xl object-cover"
                priority
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 🔹 MOBILNA VERZIJA 🔹 */}
        <div className="md:hidden w-full flex flex-col justify-between h-[calc(100vh-80px)] relative">
          {/* Slika preko cele širine */}
          <div className="relative w-full flex-1">
            <Image
              src={getImageForView(view)}
              alt="Mobile Background"
              fill
              className="object-cover object-center"
              priority
            />
          </div>

          {/* Dugmad koja preklapaju sliku */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 
                          w-[95%] flex justify-around items-center 
                          bg-white/70 backdrop-blur-md border border-brandCyan/30 
                          rounded-2xl shadow-lg py-3 px-2 transition-all duration-300">
            {visibleCards().map(btn => (
              <button
                key={btn.key}
                onClick={() => setView(btn.key as View)}
                className={`flex flex-col items-center justify-center 
                            text-sm font-semibold text-brandBlue 
                            bg-gradient-to-b from-brandCyan/30 to-brandCyan/10
                            border border-brandCyan/40 
                            rounded-xl px-4 py-3 mx-1 shadow-md 
                            hover:from-brandCyan/50 hover:to-brandCyan/20 
                            active:scale-95 transition-all
                            ${view === btn.key ? "hidden" : ""}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

      </main>
    </>
  )
}
