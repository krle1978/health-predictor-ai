import React from "react"

type Props = {
  id: string
  title: string
  description: string
  children: React.ReactNode
}

export default function PredictionCard({ id, title, description, children }: Props) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="rounded-2xl border border-brandCyan/40 shadow-card p-6 bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <span className="text-sm text-brandCyan">{description}</span>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </section>
  )
}
