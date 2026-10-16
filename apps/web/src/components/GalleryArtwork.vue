<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    variant: number;
  }>(),
  {
    title: 'AI 生成作品',
  },
);
</script>

<template>
  <svg
    class="gallery-artwork"
    viewBox="0 0 320 360"
    role="img"
    :aria-label="title"
    preserveAspectRatio="xMidYMid slice"
  >
    <defs>
      <linearGradient id="sky-1" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#f9d8e8" />
        <stop offset="0.55" stop-color="#b8c9ff" />
        <stop offset="1" stop-color="#5e69ad" />
      </linearGradient>
      <linearGradient id="sky-2" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#c8f0ff" />
        <stop offset="1" stop-color="#5278c8" />
      </linearGradient>
      <linearGradient id="metal" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#fff8e9" />
        <stop offset="0.5" stop-color="#cfb886" />
        <stop offset="1" stop-color="#69542c" />
      </linearGradient>
      <linearGradient id="peach" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#ffd6b8" />
        <stop offset="1" stop-color="#e98a7d" />
      </linearGradient>
      <linearGradient id="green" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#b7f1c7" />
        <stop offset="1" stop-color="#2c8566" />
      </linearGradient>
      <filter id="blur-soft">
        <feGaussianBlur stdDeviation="12" />
      </filter>
    </defs>

    <template v-if="variant % 8 === 0">
      <rect width="320" height="360" fill="url(#sky-1)" />
      <circle cx="252" cy="72" r="40" fill="#fff" opacity="0.72" filter="url(#blur-soft)" />
      <path d="M0 252 96 155l62 55 40-36 122 111v75H0Z" fill="#3a446e" />
      <path d="M0 292 120 202l45 36 78-60 77 70v112H0Z" fill="#252d4c" />
      <path d="M0 335c76-25 150-22 320 5v20H0Z" fill="#161c35" />
      <circle cx="86" cy="96" r="3" fill="#fff" />
      <circle cx="118" cy="62" r="2" fill="#fff" />
      <circle cx="208" cy="116" r="2" fill="#fff" />
    </template>

    <template v-else-if="variant % 8 === 1">
      <rect width="320" height="360" fill="#e9edf3" />
      <rect x="25" y="24" width="270" height="312" rx="18" fill="#c9d4e2" />
      <rect x="48" y="48" width="224" height="264" rx="12" fill="#f8fafc" />
      <rect x="68" y="76" width="156" height="90" rx="7" fill="#87a9cf" />
      <circle cx="177" cy="105" r="18" fill="#fff4d6" />
      <path d="M68 166h156v104H68z" fill="#d3b394" />
      <path d="M68 220c50-22 102-25 156-3v53H68z" fill="#a87858" />
      <ellipse cx="145" cy="302" rx="74" ry="15" fill="#cfd5dd" />
      <path d="M236 49v262" stroke="#b7c0cb" stroke-width="8" />
    </template>

    <template v-else-if="variant % 8 === 2">
      <rect width="320" height="360" fill="#f2eee7" />
      <circle cx="160" cy="132" r="92" fill="#f6d8bf" opacity="0.7" />
      <ellipse cx="162" cy="306" rx="112" ry="32" fill="#d5c4ae" />
      <rect x="94" y="110" width="132" height="157" rx="24" fill="url(#peach)" />
      <path d="M110 266h100l24 52H86z" fill="#803d3b" />
      <path d="M126 116c5-45 63-45 68 0" fill="none" stroke="#583a40" stroke-width="17" />
      <path d="M135 178c12 12 39 12 50 0" fill="none" stroke="#8d4d51" stroke-width="4" />
      <circle cx="134" cy="153" r="4" fill="#422e3b" />
      <circle cx="188" cy="153" r="4" fill="#422e3b" />
      <path d="M95 136c-18-31 2-71 45-78" fill="none" stroke="#d27a75" stroke-width="8" />
      <path d="M225 136c18-31-2-71-45-78" fill="none" stroke="#d27a75" stroke-width="8" />
    </template>

    <template v-else-if="variant % 8 === 3">
      <rect width="320" height="360" fill="#e5eee8" />
      <circle cx="160" cy="178" r="137" fill="#d7e5db" />
      <path
        d="M66 62c28-34 52-31 68 2 18-35 58-43 86-8 34-7 54 16 44 48 28 20 21 58-7 73 4 32-31 49-57 34-22 23-61 21-76-7-30 12-58-8-53-42-28-19-25-61 5-78-2-12 2-20 10-22Z"
        fill="#7baf8b"
      />
      <path
        d="M96 105c36-26 80-28 119-5M82 155c48-27 102-28 151 1M98 216c38-24 81-23 121 2"
        fill="none"
        stroke="#eef8ee"
        stroke-width="10"
        stroke-linecap="round"
      />
      <circle cx="160" cy="177" r="44" fill="url(#green)" />
      <circle cx="160" cy="177" r="25" fill="#f8fff8" opacity="0.9" />
      <path d="M160 152v50M135 177h50" stroke="#3c8c69" stroke-width="8" />
      <circle cx="73" cy="276" r="10" fill="#f6c75e" />
      <circle cx="252" cy="82" r="8" fill="#f49daf" />
    </template>

    <template v-else-if="variant % 8 === 4">
      <rect width="320" height="360" fill="url(#sky-2)" />
      <circle cx="244" cy="78" r="36" fill="#fff6bf" />
      <path d="M0 278h320v82H0z" fill="#d2e8dc" />
      <path d="M31 270h258l-38-148H69Z" fill="#f5f8fa" />
      <path d="M92 127h136l18 61H74Z" fill="#8eb8d3" />
      <path d="M56 270h207l56 44H0Z" fill="#708d78" />
      <path d="M114 166h92v24h-92zM104 211h112v24H104z" fill="#d5edf7" />
      <path d="M160 125v145M91 216h138" stroke="#b4cbd8" stroke-width="6" />
      <path d="M47 310h112v8H47z" fill="#e5f5e8" opacity="0.75" />
    </template>

    <template v-else-if="variant % 8 === 5">
      <rect width="320" height="360" fill="#f5efe4" />
      <ellipse cx="160" cy="314" rx="118" ry="24" fill="#b89b77" opacity="0.35" />
      <path d="M66 145h188l-24 142H90Z" fill="#e4c49d" />
      <path d="M83 168h154l-18 99H99Z" fill="#774e38" />
      <path
        d="M52 145c44 29 173 29 216 0-18-48-56-29-78-53-21 18-38-19-59 0-23-5-62-3-79 53Z"
        fill="#d4a566"
      />
      <path
        d="M99 181c44 19 79 19 123 0M96 217c42 19 83 19 127 0M102 247c36 14 76 14 112 0"
        fill="none"
        stroke="#f3d7ac"
        stroke-width="10"
        stroke-linecap="round"
      />
      <circle cx="152" cy="111" r="8" fill="#88a75c" />
      <circle cx="177" cy="96" r="7" fill="#e26e58" />
      <path d="M92 98c-9-26-28-37-51-39 7 28 25 41 51 39Z" fill="url(#green)" />
    </template>

    <template v-else-if="variant % 8 === 6">
      <rect width="320" height="360" fill="#1a1e29" />
      <circle cx="242" cy="94" r="72" fill="#7059d5" />
      <circle cx="91" cy="214" r="102" fill="#e55778" />
      <circle cx="219" cy="270" r="88" fill="#ec9d4d" />
      <path d="M0 196 320 72v288H0Z" fill="#191c26" opacity="0.55" />
      <path
        d="M-30 318C52 231 98 251 162 172c38-47 90-68 186-49"
        fill="none"
        stroke="#fff"
        stroke-width="5"
        opacity="0.6"
      />
      <circle cx="61" cy="102" r="3" fill="#fff" />
      <circle cx="130" cy="67" r="2" fill="#fff" />
      <circle cx="275" cy="187" r="3" fill="#fff" />
    </template>

    <template v-else>
      <rect width="320" height="360" fill="#f6efe8" />
      <path d="M0 240c58-32 115-30 173 3 48 28 96 28 147 0v117H0Z" fill="#d8ccbf" />
      <path d="M110 84h100l52 270H58Z" fill="#f3eee9" />
      <path d="M116 84h88l-4 270h-79Z" fill="#d9d2cb" />
      <rect x="91" y="64" width="138" height="32" rx="5" fill="url(#metal)" />
      <rect x="127" y="137" width="66" height="136" rx="28" fill="#6f8fb1" />
      <rect x="140" y="155" width="42" height="72" rx="19" fill="#d9e5ef" opacity="0.72" />
      <circle cx="160" cy="302" r="19" fill="#c5a76e" />
      <path
        d="M32 286c46-27 82-28 124-5"
        fill="none"
        stroke="#b8a897"
        stroke-width="8"
        stroke-linecap="round"
      />
    </template>
  </svg>
</template>

<style scoped>
.gallery-artwork {
  width: 100%;
  height: 100%;
}
</style>
