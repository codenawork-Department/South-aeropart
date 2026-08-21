/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "420px",
        "3xl": "1920px",
        "4xl": "2560px",
      },
    },
  },
  plugins: [],
};

