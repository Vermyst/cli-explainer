/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:        "#0a0a0b",
        surface:   "#111113",
        border:    "#1e1e22",
        "border-bright": "#2e2e35",
        green:     "#00ff9d",
        "green-dim": "#00c97a",
        red:       "#ff4d6d",
        yellow:    "#ffcc00",
        cream:     "#f0e6d3",
        muted:     "#6b6b78",
        dim:       "#3a3a42",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        ui:   ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": "0.65rem",
      },
    },
  },
  plugins: [],
};
