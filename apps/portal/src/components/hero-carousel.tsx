"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface Slide {
  src: string;
  alt: string;
}

const SLIDES: Slide[] = [
  {
    src: "/kip-yard.jpg",
    alt: "Aerial view of the Kabalega drilling support yard on the shore of Lake Albert",
  },
  {
    src: "/kip-refinery-build.jpg",
    alt: "Uganda Greenfield Refinery under construction — pipe racks and storage vessels",
  },
  {
    src: "/kip-rig.jpg",
    alt: "Drilling rig operating against the Kabalega escarpment",
  },
];

/**
 * Full-bleed background carousel for the hero. Renders behind the hero
 * content — a dark overlay keeps overlaid text legible on every slide.
 */
export function HeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 -z-0 overflow-hidden">
      {SLIDES.map((slide, i) => (
        <div
          key={slide.src}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== index}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            sizes="100vw"
            className="object-cover"
            priority={i === 0}
          />
        </div>
      ))}

      {/* Legibility overlay — darkens image and biases toward the left where text sits */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/30" />
      <div className="absolute inset-0 bg-black/30" />

      {/* Dots */}
      <div className="absolute bottom-6 right-5 z-10 flex gap-2 sm:right-10 lg:right-[100px]">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            onClick={() => setIndex(i)}
            aria-label={`Show slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
