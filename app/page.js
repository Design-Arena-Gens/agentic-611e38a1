"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const sections = [
  {
    title: "Verse",
    lyrics: [
      "Moonlight drips like honey down the avenue,",
      "Trumpets whisper secrets only night owls knew,",
      "Tiptoe bassline shivers through the midnight dew,",
      "Every note a neon sigh in indigo hues."
    ],
    chords: ["Cm9", "F13", "Bbmaj7", "Eb9"]
  },
  {
    title: "Chorus",
    lyrics: [
      "Swing me slow, let the rhythm glow,",
      "Pocket full of blue notes, ready to overflow,",
      "Satin shadows dancing in a syncopated show,",
      "Stay till the sunrise tells us to go."
    ],
    chords: ["Abmaj9", "G7b9", "Cm9", "F13", "Bbmaj7"]
  },
  {
    title: "Bridge",
    lyrics: [
      "Snap of the snare, velvet in the air,",
      "Walk that upright heartbeat, cool and rare,",
      "Sip of cymbal shimmer says we're almost there,",
      "Hold this chromatic kiss if you dare."
    ],
    chords: ["Dm7b5", "G7b13", "Cm9", "Fm9", "Bb13"]
  }
];

const tempo = 96;
const swingRatio = 0.6;

function scheduleSwing(context, startTime, swing, cb) {
  let currentBeat = 0;
  const beatDuration = 60 / tempo;

  function loop() {
    const now = context.currentTime;
    while (startTime + beatDuration * currentBeat < now + 0.2) {
      const beatStart = startTime + beatDuration * currentBeat;
      const isOffbeat = currentBeat % 2 === 1;
      const offset = isOffbeat ? beatDuration * (1 - swing) : beatDuration * swing;
      cb(beatStart + (isOffbeat ? offset : 0), currentBeat);
      currentBeat += 1;
    }
    requestAnimationFrame(loop);
  }
  loop();
}

function createRhythmSection(context) {
  const master = context.createGain();
  master.gain.value = 0.4;
  master.connect(context.destination);

  const swingGain = context.createGain();
  swingGain.gain.value = 0.5;
  swingGain.connect(master);

  const bassGain = context.createGain();
  bassGain.gain.value = 0.35;
  bassGain.connect(master);

  const rideGain = context.createGain();
  rideGain.gain.value = 0.25;
  rideGain.connect(master);

  return { master, swingGain, bassGain, rideGain };
}

function playChord(context, destination, rootFreq) {
  const harmony = [
    0,
    Math.pow(2, 4 / 12),
    Math.pow(2, 7 / 12),
    Math.pow(2, 10 / 12),
    Math.pow(2, 14 / 12)
  ];
  const chordGain = context.createGain();
  chordGain.gain.setValueAtTime(0, context.currentTime);
  chordGain.gain.linearRampToValueAtTime(0.35, context.currentTime + 0.02);
  chordGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1.8);
  chordGain.connect(destination);

  harmony.forEach((ratio) => {
    const osc = context.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(rootFreq * ratio, context.currentTime);
    osc.connect(chordGain);
    osc.start(context.currentTime);
    osc.stop(context.currentTime + 1.9);
  });
}

const chordRoots = {
  Cm9: 130.81,
  F13: 174.61,
  Bbmaj7: 233.08,
  Eb9: 155.56,
  Abmaj9: 207.65,
  G7b9: 196.0,
  Dm7b5: 146.83,
  G7b13: 196.0,
  Fm9: 174.61,
  Bb13: 233.08
};

function buildAudioEngine() {
  const context = new AudioContext();
  const { bassGain, rideGain, swingGain } = createRhythmSection(context);

  const startTime = context.currentTime + 0.1;
  const barDuration = (60 / tempo) * 4;
  const bassPattern = [0, 2.5, 3];
  let barIndex = 0;

  scheduleSwing(context, startTime, swingRatio, (time, beat) => {
    const beatInBar = beat % 4;
    const barStart = time - beatInBar * (60 / tempo);
    const currentSectionIndex = Math.floor((barStart - startTime) / barDuration) % sections.length;
    const chord =
      sections[currentSectionIndex].chords[
        Math.floor((barStart - startTime) / barDuration) %
          sections[currentSectionIndex].chords.length
      ] || sections[currentSectionIndex].chords[0];

    if (beatInBar === 0) {
      const ride = context.createBufferSource();
      const rideBuffer = context.createBuffer(1, context.sampleRate * 0.15, context.sampleRate);
      const rideData = rideBuffer.getChannelData(0);
      for (let i = 0; i < rideData.length; i += 1) {
        rideData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (rideData.length * 0.8));
      }
      ride.buffer = rideBuffer;
      ride.connect(rideGain);
      ride.start(time);
    }

    const hat = context.createBufferSource();
    const hatBuffer = context.createBuffer(1, context.sampleRate * 0.08, context.sampleRate);
    const hatData = hatBuffer.getChannelData(0);
    for (let i = 0; i < hatData.length; i += 1) {
      hatData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (hatData.length * 0.35));
    }
    hat.buffer = hatBuffer;
    hat.connect(swingGain);
    hat.start(time);

    if (bassPattern.includes(beatInBar)) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const freqStep = [0, 5, 7, 3][(barIndex + beatInBar) % 4];
      const base = chordRoots[chord] || 130.81;
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(base * Math.pow(2, freqStep / 12), time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.45, time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
      osc.connect(gain);
      gain.connect(bassGain);
      osc.start(time);
      osc.stop(time + 0.5);
    }

    if (beatInBar === 0) {
      barIndex += 1;
      playChord(context, swingGain, chordRoots[chord] || 130.81);
    }
  });

  return context;
}

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const audioRef = useRef(null);

  const totalSections = useMemo(() => sections.length, []);

  useEffect(() => {
    let animationFrame;
    if (isPlaying) {
      const advance = () => {
        setCurrentSection((prev) => (prev + 1) % totalSections);
        animationFrame = setTimeout(advance, (60 / tempo) * 4000);
      };
      animationFrame = setTimeout(advance, (60 / tempo) * 4000);
    }
    return () => {
      clearTimeout(animationFrame);
    };
  }, [isPlaying, totalSections]);

  const handleToggle = async () => {
    if (!isPlaying) {
      if (!audioRef.current) {
        audioRef.current = buildAudioEngine();
      } else if (audioRef.current.state === "suspended") {
        await audioRef.current.resume();
      }
      setIsPlaying(true);
    } else if (audioRef.current) {
      await audioRef.current.suspend();
      setIsPlaying(false);
    }
  };

  return (
    <main className="page">
      <div className="hero">
        <h1>Midnight Honey</h1>
        <p>Freshly brewed jazz with lyrics that sway and interplay.</p>
        <button type="button" className="play-button" onClick={handleToggle}>
          {isPlaying ? "Pause Groove" : "Play Groove"}
        </button>
      </div>

      <section className="song-structure">
        {sections.map((section, index) => (
          <article
            key={section.title}
            className={`section ${currentSection === index ? "active" : ""}`}
          >
            <header>
              <h2>{section.title}</h2>
              <div className="chords">
                {section.chords.map((chord) => (
                  <span key={chord}>{chord}</span>
                ))}
              </div>
            </header>
            <ul>
              {section.lyrics.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
