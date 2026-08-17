// Shared SVG icons — keep tiny. All use currentColor.
const Icon = ({ d, size = 16, sw = 2, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Icons = {
  Dashboard:  (p) => <Icon {...p} d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" />,
  Package:    (p) => <Icon {...p} d="M21 8L12 3 3 8v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v9" />,
  Box:        (p) => <Icon {...p} d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10" />,
  Pencil:     (p) => <Icon {...p} d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />,
  Card:       (p) => <Icon {...p} d="M2 7h20v12H2zM2 11h20" />,
  History:    (p) => <Icon {...p} d="M3 12a9 9 0 1 0 3-6.7M3 4v6h6M12 7v5l3 2" />,
  Users:      (p) => <Icon {...p} d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
  Logout:     (p) => <Icon {...p} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  Plus:       (p) => <Icon {...p} d="M12 5v14M5 12h14" />,
  Banknote:   (p) => <Icon {...p} d="M2 6h20v12H2zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 9v.01M18 15v.01" />,
  Rupee:      (p) => <Icon {...p} d="M6 3h12M6 8h12M9 13c5 0 5-5 0-5h-3M9 13l5 8" />,
  CheckCircle:(p) => <Icon {...p} d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />,
  Alert:      (p) => <Icon {...p} d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />,
  TrendUp:    (p) => <Icon {...p} d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6" />,
  TrendDown:  (p) => <Icon {...p} d="M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6" />,
  Receipt:    (p) => <Icon {...p} d="M6 2v20l3-2 3 2 3-2 3 2V2zM8 7h8M8 11h8M8 15h4" />,
  Leaf:       (p) => <Icon {...p} d="M11 20A7 7 0 0 1 4 13c0-4 3-9 9-11 1 6-1 12-5 14M11 20a7 7 0 1 1 9-9c-2 4-5 7-9 9" />,
  Clock:      (p) => <Icon {...p} d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2" />,
  Loader:     (p) => <Icon {...p} d="M21 12a9 9 0 1 1-6.22-8.56" />,
  Wallet:     (p) => <Icon {...p} d="M20 12V8H6a2 2 0 0 1 0-4h12v4M4 6v12a2 2 0 0 0 2 2h14v-4M18 12a2 2 0 0 0 0 4h4v-4z" />,
  X:          (p) => <Icon {...p} d="M18 6L6 18M6 6l12 12" />,
  Phone:      (p) => <Icon {...p} d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
  Mail:       (p) => <Icon {...p} d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6" />,
  Pin:        (p) => <Icon {...p} d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />,
  Search:     (p) => <Icon {...p} d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" />,
  Chevron:    (p) => <Icon {...p} d="M6 9l6 6 6-6" />,
  Download:   (p) => <Icon {...p} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  Filter:     (p) => <Icon {...p} d="M22 3H2l8 9.46V19l4 2v-8.54z" />,
  Dots:       (p) => <Icon {...p} d="M12 12h.01M12 6h.01M12 18h.01" sw={3} />,
  Arrow:      (p) => <Icon {...p} d="M5 12h14M12 5l7 7-7 7" />,
  External:   (p) => <Icon {...p} d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />,
};

window.Icons = Icons;
