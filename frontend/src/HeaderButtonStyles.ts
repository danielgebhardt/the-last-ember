export const HEADER_BUTTON_BASE = `
   h-9 shrink-0 gap-2 rounded-md border
   px-2 xl:px-3 font-medium
   transition-[background-color,border-color,box-shadow,color]
   duration-200
   focus-visible:ring-2 focus-visible:ring-ring
   focus-visible:ring-offset-2
   focus-visible:ring-offset-background
`;

export const HEADER_BUTTON_PRIMARY = `
   ${HEADER_BUTTON_BASE}
   border-amber-700/60
   bg-gradient-to-b from-amber-300 to-amber-500
   font-semibold text-amber-950
   shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_6px_rgba(120,65,15,0.15)]
   hover:border-amber-600
   hover:from-amber-200 hover:to-amber-400
   dark:border-amber-500/65
   dark:from-[#704012] dark:to-[#39220f]
   dark:text-amber-100
   dark:shadow-[inset_0_1px_0_rgba(255,210,130,0.12),0_2px_8px_rgba(0,0,0,0.18)]
   dark:hover:border-amber-400/80
   dark:hover:from-[#845019] dark:hover:to-[#503015]
`;

export const HEADER_BUTTON_SECONDARY = `
   ${HEADER_BUTTON_BASE}
   border-amber-900/35
   bg-gradient-to-b from-card to-muted/60
   text-foreground
   shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_1px_3px_rgba(0,0,0,0.06)]

   hover:border-amber-700/75
   hover:from-amber-100
   hover:to-amber-200/80
   hover:text-amber-950
   hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_0_10px_rgba(180,110,35,0.18)]

   dark:border-amber-700/40
   dark:from-[#28241e]
   dark:to-[#1d1b19]
   dark:text-[#e8dac7]
   dark:shadow-[inset_0_1px_0_rgba(255,215,150,0.06),0_1px_3px_rgba(0,0,0,0.2)]
   dark:hover:border-amber-500/65
   dark:hover:from-[#332a20]
   dark:hover:to-[#27211b]
   dark:hover:text-amber-100
   dark:hover:shadow-[0_0_9px_rgba(245,158,11,0.12)]
`;
