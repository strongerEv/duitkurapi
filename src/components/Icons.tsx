/** Kumpulan ikon SVG inline agar aplikasi tetap ringan tanpa library ikon. */
import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

function base({ size = 22, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest,
  };
}

export const IconHome = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.6V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.6" /></svg>
);

export const IconList = (p: IconProps) => (
  <svg {...base(p)}><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1.3" fill="currentColor" stroke="none" /><circle cx="3.5" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="3.5" cy="18" r="1.3" fill="currentColor" stroke="none" /></svg>
);

export const IconChart = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
);

/** Ikon hutang-piutang: dua panah bertukar arah (uang keluar & kembali). */
export const IconHandshake = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 8h13l-3.4-3.4" /><path d="M20 16H7l3.4 3.4" /></svg>
);

export const IconSettings = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1A1.7 1.7 0 0 0 11 3.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
);

export const IconPlus = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" strokeWidth={2.4} /></svg>
);

export const IconBell = (p: IconProps) => (
  <svg {...base(p)}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
);

export const IconSearch = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
);

export const IconBack = (p: IconProps) => (
  <svg {...base(p)}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
);

export const IconChevronRight = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><path d="m9 18 6-6-6-6" /></svg>
);

export const IconChevronDown = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><path d="m6 9 6 6 6-6" /></svg>
);

export const IconClose = (p: IconProps) => (
  <svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>
);

export const IconTrash = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" /><path d="M10 11v6M14 11v6" /></svg>
);

export const IconEdit = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);

export const IconEye = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
);

export const IconEyeOff = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><path d="M10.6 6.2A9.9 9.9 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3 3.6M6.6 6.6A17 17 0 0 0 2 12s3.6 6 10 6a9.7 9.7 0 0 0 4.2-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /><path d="m2 2 20 20" /></svg>
);

export const IconWhatsApp = ({ size = 20, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}>
    <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.4-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.4.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1.1 2.8 1.2 3c.2.2 2.1 3.2 5 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3Z" />
    <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .9.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z" />
  </svg>
);

export const IconWallet = (p: IconProps) => (
  <svg {...base(p)}><path d="M20 12V8a2 2 0 0 0-2-2H5a2 2 0 0 1 0-4h12" /><path d="M3 6v12a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4" /><circle cx="17" cy="14" r="1.3" fill="currentColor" stroke="none" /></svg>
);

export const IconArrowDown = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
);

export const IconArrowUp = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
);

export const IconCheck = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><path d="m4 12 5 5L20 6" strokeWidth={2.4} /></svg>
);

export const IconCalendar = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
);

export const IconClock = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" /></svg>
);

export const IconDownload = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><path d="M12 3v12M7 11l5 5 5-5" /><path d="M4 20h16" /></svg>
);

export const IconUpload = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><path d="M12 17V5M7 9l5-5 5 5" /><path d="M4 20h16" /></svg>
);

export const IconCopy = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" /></svg>
);

export const IconUser = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>
);

export const IconPhone = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18.5h2" /></svg>
);

export const IconFilter = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><path d="M3 5h18M6 12h12M10 19h4" /></svg>
);

export const IconTarget = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /></svg>
);

export const IconAlert = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><path d="M12 3.5 22 20H2L12 3.5Z" /><path d="M12 10v4.5M12 17.5h.01" /></svg>
);

export const IconFileText = (p: IconProps) => (
  <svg {...base({ size: 18, ...p })}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></svg>
);
