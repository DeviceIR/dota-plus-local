type Props = { id: string };

export function ObjectiveArt({ id }: Props) {
  switch (id) {
    case "bounty":
      return (
        <svg viewBox="0 0 120 90" className="obj-svg" aria-hidden>
          <defs>
            <radialGradient id="bountyGlow" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#f4d36a" />
              <stop offset="100%" stopColor="#8a5a12" />
            </radialGradient>
          </defs>
          <rect width="120" height="90" fill="#1a1408" />
          <circle cx="60" cy="48" r="28" fill="url(#bountyGlow)" stroke="#f6e27a" strokeWidth="3" />
          <text x="60" y="58" textAnchor="middle" fontSize="28" fontWeight="700" fill="#3b2508">
            $
          </text>
        </svg>
      );
    case "water":
      return (
        <svg viewBox="0 0 120 90" className="obj-svg" aria-hidden>
          <rect width="120" height="90" fill="#082028" />
          <path d="M60 18 C60 18 36 48 36 62 a24 24 0 0 0 48 0 C84 48 60 18 60 18z" fill="#3ec6e8" />
          <ellipse cx="52" cy="58" rx="6" ry="10" fill="#b7f3ff" opacity="0.55" />
        </svg>
      );
    case "power":
      return (
        <svg viewBox="0 0 120 90" className="obj-svg" aria-hidden>
          <rect width="120" height="90" fill="#160820" />
          <polygon points="64,14 40,48 56,48 48,76 84,40 66,40" fill="#c084fc" />
          <polygon points="64,22 48,48 58,48 54,66 76,42 64,42" fill="#f3e8ff" />
        </svg>
      );
    case "lotus":
      return (
        <svg viewBox="0 0 120 90" className="obj-svg" aria-hidden>
          <rect width="120" height="90" fill="#1a0e18" />
          <ellipse cx="60" cy="70" rx="28" ry="8" fill="#3a2040" />
          <path d="M60 70 Q40 40 60 22 Q80 40 60 70" fill="#f472b6" />
          <path d="M60 70 Q28 52 38 28 Q58 48 60 70" fill="#fb7185" />
          <path d="M60 70 Q92 52 82 28 Q62 48 60 70" fill="#fb7185" />
          <circle cx="60" cy="48" r="7" fill="#fde68a" />
        </svg>
      );
    case "wisdom":
      return (
        <svg viewBox="0 0 120 90" className="obj-svg" aria-hidden>
          <rect width="120" height="90" fill="#0c1220" />
          <rect x="28" y="38" width="64" height="36" rx="4" fill="#334155" />
          <polygon points="28,38 60,18 92,38" fill="#60a5fa" />
          <rect x="54" y="50" width="12" height="24" fill="#93c5fd" />
          <circle cx="60" cy="30" r="6" fill="#fde68a" />
        </svg>
      );
    case "rosh":
      return (
        <svg viewBox="0 0 120 90" className="obj-svg" aria-hidden>
          <rect width="120" height="90" fill="#140808" />
          <ellipse cx="60" cy="58" rx="32" ry="22" fill="#7f1d1d" />
          <circle cx="48" cy="50" r="7" fill="#fbbf24" />
          <circle cx="72" cy="50" r="7" fill="#fbbf24" />
          <path d="M40 68 Q60 80 80 68" stroke="#450a0a" strokeWidth="4" fill="none" />
          <path d="M36 36 L44 48 M84 36 L76 48" stroke="#fca5a5" strokeWidth="3" />
        </svg>
      );
    case "tormentor":
      return (
        <svg viewBox="0 0 120 90" className="obj-svg" aria-hidden>
          <rect width="120" height="90" fill="#121018" />
          <polygon points="60,12 88,78 32,78" fill="#a8a29e" />
          <polygon points="60,20 78,72 42,72" fill="#e7e5e4" />
          <circle cx="52" cy="48" r="4" fill="#7f1d1d" />
          <circle cx="68" cy="48" r="4" fill="#7f1d1d" />
        </svg>
      );
    case "daynight":
      return (
        <svg viewBox="0 0 120 90" className="obj-svg" aria-hidden>
          <rect width="120" height="90" fill="#0b1220" />
          <circle cx="42" cy="44" r="16" fill="#fbbf24" />
          <circle cx="82" cy="48" r="14" fill="#e5e7eb" />
          <circle cx="76" cy="42" r="12" fill="#0b1220" />
        </svg>
      );
    case "siege":
      return (
        <svg viewBox="0 0 120 90" className="obj-svg" aria-hidden>
          <rect width="120" height="90" fill="#1c1917" />
          <rect x="24" y="50" width="72" height="14" fill="#78716c" />
          <polygon points="70,24 86,50 54,50" fill="#a8a29e" />
          <circle cx="36" cy="70" r="8" fill="#44403c" />
          <circle cx="84" cy="70" r="8" fill="#44403c" />
        </svg>
      );
    case "stack":
      return (
        <svg viewBox="0 0 120 90" className="obj-svg" aria-hidden>
          <rect width="120" height="90" fill="#102014" />
          <circle cx="44" cy="52" r="14" fill="#4d7c0f" />
          <circle cx="70" cy="44" r="16" fill="#65a30d" />
          <circle cx="64" cy="62" r="12" fill="#3f6212" />
        </svg>
      );
    case "neutrals":
      return (
        <svg viewBox="0 0 120 90" className="obj-svg" aria-hidden>
          <rect width="120" height="90" fill="#1c1408" />
          <rect x="38" y="28" width="44" height="44" rx="6" fill="#b45309" />
          <rect x="46" y="36" width="28" height="28" rx="4" fill="#fbbf24" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 120 90" className="obj-svg" aria-hidden>
          <rect width="120" height="90" fill="#12161f" />
        </svg>
      );
  }
}
