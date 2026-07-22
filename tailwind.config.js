// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // Palette aus der Welt des Themas: Prospektpapier, Discounter-Blau,
        // Aktionsrot. Rot ist AUSSCHLIESSLICH für Preise und Angebots-Signale
        // reserviert — sobald es dekorativ wird, verliert es seine Bedeutung.
        ink: '#14171A',
        paper: '#EDEFF2',
        card: '#FFFFFF',
        signal: '#D7263D',
        deep: '#1B3A6B',
        muted: '#6B7280',
        hair: '#DCE0E6',
      },
      fontFamily: {
        // Schmalschnitt für Preise und Zahlen — die Typografie von Regaletiketten.
        display: ['"Archivo Narrow"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      letterSpacing: {
        label: '0.08em',
      },
    },
  },
  plugins: [],
}
