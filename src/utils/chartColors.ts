/**
 * Escala de color por rendimiento (ámbar → azul → violeta → verde), usada en
 * gráficas donde cada valor se colorea según qué tan bien se desempeñó ese
 * punto frente al resto del conjunto. A diferencia del resto de la app (que
 * se limita a Oxford Blue + los 4 semánticos), esta escala es una excepción
 * deliberada para gráficas de "desempeño en el tiempo": el color mismo es el
 * dato, no una decoración.
 */
const GRADIENT_STOPS: { at: number; rgb: [number, number, number] }[] = [
  { at: 0, rgb: [245, 158, 11] }, // ámbar — bajo rendimiento
  { at: 0.38, rgb: [76, 124, 240] }, // azul primario — dentro de rango
  { at: 0.7, rgb: [139, 92, 246] }, // violeta — por encima del objetivo
  { at: 1, rgb: [34, 197, 94] }, // verde — mejor punto del conjunto
];

function toHex([r, g, b]: [number, number, number]): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("")}`;
}

/** t: 0-1 normalizado dentro del rango de valores del conjunto. */
export function getPerformanceColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < GRADIENT_STOPS.length - 1; i++) {
    const a = GRADIENT_STOPS[i];
    const b = GRADIENT_STOPS[i + 1];
    if (clamped >= a.at && clamped <= b.at) {
      const localT = (clamped - a.at) / (b.at - a.at);
      const rgb: [number, number, number] = [
        a.rgb[0] + (b.rgb[0] - a.rgb[0]) * localT,
        a.rgb[1] + (b.rgb[1] - a.rgb[1]) * localT,
        a.rgb[2] + (b.rgb[2] - a.rgb[2]) * localT,
      ];
      return toHex(rgb);
    }
  }
  return toHex(GRADIENT_STOPS[GRADIENT_STOPS.length - 1].rgb);
}

export function lightenHex(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return toHex([r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount]);
}

/** Normaliza un valor dentro del rango [min, max] de un conjunto; si todos
 * los valores son iguales devuelve 0.5 (color medio) en vez de dividir entre cero. */
export function normalizeInRange(value: number, min: number, max: number): number {
  if (max - min < 0.0001) return 0.5;
  return (value - min) / (max - min);
}
