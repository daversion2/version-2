// The picker preview clips (assets/compose/, made by scripts/makeComposeSamples.ts).
// Kept apart from src/data/composeCatalog.ts so the catalog stays plain data
// that tests can import — require() of an mp3 only works under Metro.

export const VOICE_SAMPLES: Record<string, number> = {
  daisy: require('../../../../../../assets/compose/voice-daisy.mp3'),
  regina: require('../../../../../../assets/compose/voice-regina.mp3'),
  friend: require('../../../../../../assets/compose/voice-friend.mp3'),
  steffy: require('../../../../../../assets/compose/voice-steffy.mp3'),
  tessa: require('../../../../../../assets/compose/voice-tessa.mp3'),
};

export const BACKGROUND_SAMPLES: Record<string, number> = {
  rain: require('../../../../../../assets/compose/bg-rain.mp3'),
  ocean: require('../../../../../../assets/compose/bg-ocean.mp3'),
  creek: require('../../../../../../assets/compose/bg-creek.mp3'),
  forest: require('../../../../../../assets/compose/bg-forest.mp3'),
  fire: require('../../../../../../assets/compose/bg-fire.mp3'),
  drone: require('../../../../../../assets/compose/bg-drone.mp3'),
  'brown-noise': require('../../../../../../assets/compose/bg-brown-noise.mp3'),
  'pink-noise': require('../../../../../../assets/compose/bg-pink-noise.mp3'),
};
