import { referencePaletteEntries } from './reference-palettes.js';

// Keep the original theme separate so Reset always restores the existing design.
export const paletteCategories = [
  ['all', 'All'], ['dark', 'Dark'], ['blue', 'Blue'],
  ['nature', 'Nature'], ['warm', 'Warm'], ['minimal', 'Minimal'],
  ['vibrant', 'Vibrant'], ['pastel', 'Pastel'], ['luxury', 'Luxury'],
  ['favorites', 'Favourites']
];

export const originalPalette = {
  id: 'original',
  name: 'Original Theme',
  category: 'all',
  family: 'Teal',
  colors: ['#111e23', '#1c2d32', '#1c756c', '#85d4c3', '#f2f7f4'],
  source: null
};

const clamp = value => Math.max(0, Math.min(255, Math.round(value)));
const rgb = hex => {
  const clean = hex.replace('#', '');
  const value = clean.length === 3 ? clean.split('').map(part => part + part).join('') : clean;
  return [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16));
};
const hex = channels => `#${channels.map(channel => clamp(channel).toString(16).padStart(2, '0')).join('')}`;
const mix = (first, second, amount) => hex(rgb(first).map((channel, index) => channel * (1 - amount) + rgb(second)[index] * amount));
const luminance = color => {
  const channels = rgb(color).map(value => {
    const normalized = value / 255;
    return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
};
const colorFamily = color => {
  const channels = rgb(color).map(value => value / 255);
  const high = Math.max(...channels);
  const low = Math.min(...channels);
  const delta = high - low;
  if (delta < .1) return high > .82 ? 'white' : high < .22 ? 'black' : 'gray';
  let hue = high === channels[0] ? ((channels[1] - channels[2]) / delta) % 6 : high === channels[1] ? (channels[2] - channels[0]) / delta + 2 : (channels[0] - channels[1]) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  if (hue < 18 || hue >= 345) return 'red';
  if (hue < 46) return high < .63 ? 'brown' : 'orange';
  if (hue < 72) return 'yellow';
  if (hue < 165) return 'green';
  if (hue < 195) return 'teal cyan';
  if (hue < 255) return 'blue';
  if (hue < 290) return 'purple';
  return 'pink';
};
const contrast = (first, second) => {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
};
const accessible = (color, background, toward, minimum = 4.5) => {
  if (contrast(color, background) >= minimum) return color;
  for (let step = 1; step <= 20; step += 1) {
    const candidate = mix(color, toward, step / 20);
    if (contrast(candidate, background) >= minimum) return candidate;
  }
  return toward;
};

export function getPalette(id) {
  return palettes.find(palette => palette.id === id) || originalPalette;
}

export function paletteTokens(palette, appearance) {
  if (!palette || palette.id === 'original') return null;
  const ordered = palette.colors.map(color => color.toLowerCase());
  const byLightness = [...ordered].sort((a, b) => luminance(a) - luminance(b));
  const dark = appearance === 'dark';
  const base = dark ? accessible(mix(byLightness[0], '#05080c', .38), '#ffffff', '#05080c', 7) : mix(byLightness.at(-1), '#ffffff', .86);
  const surface = dark ? accessible(mix(base, byLightness.at(-1), .13), '#ffffff', '#05080c', 7) : mix(byLightness.at(-1), '#ffffff', .57);
  const accentSeed = ordered.length >= 4 ? ordered[Math.floor(ordered.length / 2)] : ordered[1];
  const secondarySeed = ordered.at(-2);
  const foreground = dark ? '#f8fafc' : '#172027';
  const text = accessible(dark ? mix(byLightness.at(-1), '#ffffff', .25) : mix(byLightness[0], '#111820', .34), base, foreground, 7);
  const muted = accessible(mix(text, base, dark ? .35 : .39), base, foreground, 4.5);
  const accent = accessible(accentSeed, base, dark ? '#ffffff' : '#000000', 4.5);
  const secondary = accessible(secondarySeed, base, dark ? '#ffffff' : '#000000', 4.5);
  const button = accessible(accentSeed, '#ffffff', '#000000', 4.5);
  const buttonText = contrast('#ffffff', button) >= 4.5 ? '#ffffff' : '#111820';
  const glow = dark ? mix(accentSeed, '#ffffff', .23) : mix(accentSeed, '#000000', .13);
  const panelText = dark ? '#ffffff' : '#172027';
  const panelToward = dark ? '#080d14' : '#ffffff';
  const gradientStart = accessible(mix(ordered[1] || accentSeed, panelToward, dark ? .42 : .72), panelText, panelToward, 4.5);
  const gradientEnd = accessible(mix(ordered.at(-2), panelToward, dark ? .48 : .70), panelText, panelToward, 4.5);
  return {
    '--theme-bg': base,
    '--theme-surface': surface,
    '--theme-nav': dark ? mix(base, surface, .43) : mix(base, '#ffffff', .54),
    '--theme-text': text,
    '--theme-muted': muted,
    '--theme-subtle': mix(muted, text, .35),
    '--theme-accent': accent,
    '--theme-button': button,
    '--theme-button-text': buttonText,
    '--theme-border': mix(accentSeed, base, dark ? .47 : .68),
    '--theme-accent-wash': mix(accentSeed, base, dark ? .16 : .10),
    '--theme-haze': mix(accentSeed, base, dark ? .18 : .09),
    '--theme-path': mix(accentSeed, base, dark ? .63 : .48),
    '--palette-gradient-start': gradientStart,
    '--palette-gradient-end': gradientEnd,
    '--palette-panel-text': panelText,
    '--palette-circuit-base': mix(accentSeed, base, dark ? .6 : .38),
    '--palette-circuit-active': dark ? mix(accentSeed, '#ffffff', .25) : mix(accentSeed, '#000000', .12),
    '--palette-circuit-glow': glow,
    '--palette-hero-bg': dark ? mix(base, '#000000', .22) : mix(base, '#ffffff', .25)
  };
}

export const referencePalettes = referencePaletteEntries.map(palette => ({
  ...palette,
  family: [...new Set(palette.colors.flatMap(color => colorFamily(color).split(' ')))].join(' '),
  previewGradient: `linear-gradient(90deg, ${palette.colors.join(', ')})`,
  modes: { dark: paletteTokens(palette, 'dark'), light: paletteTokens(palette, 'light') }
}));
export const palettes = [originalPalette, ...referencePalettes];

export function applyPalette(palette, appearance) {
  const root = document.documentElement;
  const previous = root.dataset.paletteVariables?.split(',').filter(Boolean) || [];
  previous.forEach(name => root.style.removeProperty(name));
  const tokens = palette?.modes?.[appearance] || paletteTokens(palette, appearance);
  if (tokens) {
    Object.entries(tokens).forEach(([name, value]) => root.style.setProperty(name, value));
    root.dataset.paletteVariables = Object.keys(tokens).join(',');
    root.dataset.palette = palette.id;
  } else {
    delete root.dataset.paletteVariables;
    delete root.dataset.palette;
  }
  root.dataset.theme = appearance;
  const browserTheme = document.querySelector('meta[name="theme-color"]');
  if (browserTheme) browserTheme.content = tokens?.['--theme-bg'] || (appearance === 'light' ? '#f4f7f3' : '#111e23');
  window.dispatchEvent(new CustomEvent('portfolio-palette-change', { detail: { paletteId: palette.id, appearance, tokens } }));
  return tokens;
}
