// expo-speech-recognition is native. Tests use this stand-in: a phone with a recogniser where the person grants the
// microphone. Tests drive it with __emit("result", …) and check __started / __stopped.
const listeners = new Map();
const mod = {
  __started: [], __stopped: 0, __granted: true,
  isRecognitionAvailable: () => true,
  requestPermissionsAsync: async () => ({ granted: mod.__granted }),
  start: (options) => { mod.__started.push(options); },
  stop: () => { mod.__stopped += 1; },
  abort: () => {},
  addListener: (name, fn) => {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(fn);
    return { remove: () => listeners.get(name).delete(fn) };
  },
  __emit: (name, event) => { for (const fn of [...(listeners.get(name) ?? [])]) fn(event); },
  __reset: () => { listeners.clear(); mod.__started = []; mod.__stopped = 0; mod.__granted = true; },
};
module.exports = { ExpoSpeechRecognitionModule: mod };
