
/**
 * Converts an RGB color value to HSL.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSL representation
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;
  
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
  
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
  
    return [h, s, l];
  }
  
  /**
   * Converts an HSL color value to RGB.
   * Assumes h, s, and l are contained in the set [0, 1] and
   * returns r, g, and b in the set [0, 255].
   *
   * @param   Number  h       The hue
   * @param   Number  s       The saturation
   * @param   Number  l       The lightness
   * @return  Array           The RGB representation
   */
  export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;
  
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
  
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
  
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
  
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
  
  /**
   * Increases the saturation of a space-separated RGB string.
   * @param rgbString "R G B" (e.g., "99 102 241")
   * @param saturationBoost Percentage to increase saturation (0.0 to 1.0). Default 0.3 (30%)
   * @returns "R G B" with increased saturation
   */
  export function boostColorSaturation(rgbString: string, saturationBoost: number = 0.3): string {
      const parts = rgbString.split(' ').map(s => parseInt(s.trim(), 10));
      if (parts.length !== 3 || parts.some(isNaN)) return rgbString;
      
      let [h, s, l] = rgbToHsl(parts[0], parts[1], parts[2]);
      
      // Increase saturation, capping at 1.0
      // We use a curve to avoid oversaturating already saturated colors too much
      // New S = S + (1 - S) * boost
      s = s + (1 - s) * saturationBoost;
      
      // Slightly increase lightness if it's too dark to make it "pop" more, 
      // but be careful not to wash it out
      if (l < 0.2) l += 0.05;
      
      const [r, g, b] = hslToRgb(h, s, l);
      return `${r} ${g} ${b}`;
  }
