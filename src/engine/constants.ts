// Vivid particle colors — hot pinks, magentas, golds, cyans that POP against dark blue
export const PARTICLE_COLORS = [
  '#FF2D78', // vivid pink
  '#FF1493', // deep pink
  '#FF00AA', // magenta-pink
  '#FF69B4', // hot pink
  '#CC44FF', // electric purple
  '#FF6B2B', // vivid orange
  '#FFa020', // amber
  '#FFD700', // gold
  '#FFEE44', // bright yellow
  '#00FFDD', // electric cyan
  '#00FF88', // spring green
  '#44DDFF', // sky cyan
  '#FF4466', // coral red
  '#FF8855', // peach orange
];

export const MAX_PARTICLES = 2000;
export const SMOOTHING_FACTOR = 0.4;

// Pose landmark connections for body skeleton particles
export const POSE_CONNECTIONS: [number, number][] = [
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15],
  // Right arm
  [12, 14], [14, 16],
  // Left leg
  [23, 25], [25, 27],
  // Right leg
  [24, 26], [26, 28],
  // Shoulders to hips
  [11, 23], [12, 24],
];
