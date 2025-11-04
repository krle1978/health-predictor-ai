import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brandBlue: "#0A2540",
        brandCyan: "#00C2CB",
      },
    },
  },
  plugins: [],
}

export default config
