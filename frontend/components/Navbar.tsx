export default function Navbar() {
  return (
       <header className="sticky top-0 z-20 bg-white/90 backdrop-blur shadow-sm">
        <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-bold text-2xl text-brandBlue">Health Predictor AI</div>
        <div className="flex gap-6">
          <a href="#heart" className="hover:text-brandCyan">Heart</a>
          <a href="#diabetes" className="hover:text-brandCyan">Diabetes</a>
          <a href="#stroke" className="hover:text-brandCyan">Stroke</a>
          <a href="#melanoma" className="hover:text-brandCyan">Melanoma</a>
        </div>
      </nav>
    </header>
  )
}
