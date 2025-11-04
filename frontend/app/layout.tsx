import "./globals.css"

export const metadata = { 
  title: "Health Predictor AI", 
  description: "Unified health predictions" 
}

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
