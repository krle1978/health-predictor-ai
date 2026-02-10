import "./globals.css"
import BackendGate from "@/components/BackendGate"

export const metadata = { 
  title: "Health Predictor AI", 
  description: "Unified health predictions" 
}

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BackendGate>{children}</BackendGate>
      </body>
    </html>
  )
}
