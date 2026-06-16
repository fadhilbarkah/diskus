export default {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "d-green": "#22c55e",
        "d-orange": "#f97316",
        "d-red": "#ef4444",
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true, // We need some reset, but hopefully it doesn't add too much size
  },
};
