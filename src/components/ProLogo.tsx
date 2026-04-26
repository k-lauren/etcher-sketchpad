/**
 * Pro-mode logo. Seven-node "diamond" graph (1 root → 2 children → 4
 * grandchildren) sized into a square. Sits directly on the header
 * background — no backplate. Only the root carries the blue→purple
 * gradient; children and grandchildren step down in opacity to read
 * as a hierarchy without competing for attention.
 */
export function ProLogo({ size = 28 }: { size?: number }) {
  // Encode the gradient id with the size so multiple instances on the
  // same page (header + future overlay variants) don't collide.
  const gradId = `pro-logo-grad-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="img"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>

      {/* Spine: root → top child, root → bottom child */}
      <line
        x1="12" y1="12" x2="12" y2="4"
        stroke="#2563EB" strokeWidth="1.4" strokeLinecap="round" opacity="0.65"
      />
      <line
        x1="12" y1="12" x2="12" y2="20"
        stroke="#2563EB" strokeWidth="1.4" strokeLinecap="round" opacity="0.65"
      />

      {/* Branches: each child → its two grandchildren */}
      <line
        x1="12" y1="4" x2="6" y2="10"
        stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"
      />
      <line
        x1="12" y1="4" x2="18" y2="10"
        stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"
      />
      <line
        x1="12" y1="20" x2="6" y2="14"
        stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"
      />
      <line
        x1="12" y1="20" x2="18" y2="14"
        stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"
      />

      {/* Grandchildren (4 outer cardinal points) */}
      <circle cx="6"  cy="10" r="1.7" fill="#2563EB" opacity="0.6" />
      <circle cx="18" cy="10" r="1.7" fill="#2563EB" opacity="0.6" />
      <circle cx="6"  cy="14" r="1.7" fill="#2563EB" opacity="0.6" />
      <circle cx="18" cy="14" r="1.7" fill="#2563EB" opacity="0.6" />

      {/* Children (top & bottom) */}
      <circle cx="12" cy="4"  r="2.0" fill="#2563EB" opacity="0.85" />
      <circle cx="12" cy="20" r="2.0" fill="#2563EB" opacity="0.85" />

      {/* Root (center, brand gradient) */}
      <circle cx="12" cy="12" r="2.6" fill={`url(#${gradId})`} />
    </svg>
  );
}
