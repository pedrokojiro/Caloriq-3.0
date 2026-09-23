export const motion = {
  duration: {
    instant: 100,
    fast: 150,
    normal: 230,
    slow: 360,
    count: 520,
  },
  spring: {
    button: { damping: 16, stiffness: 240, mass: 0.7 },
    card: { damping: 17, stiffness: 205, mass: 0.75 },
    tab: { damping: 17, stiffness: 220, mass: 0.72 },
    success: { damping: 12, stiffness: 190, mass: 0.72 },
  },
  scale: {
    buttonPressed: 0.975,
    cardPressed: 0.985,
    tabActive: 1.08,
  },
  stagger: {
    short: 55,
    normal: 80,
  },
} as const;

