<script setup lang="ts">
defineProps<{
  type: string;
}>();

const bars = [26, 47, 34, 57, 39, 63, 45];
const lineDots: Array<[number, number]> = [
  [10, 58],
  [38, 41],
  [66, 27],
  [94, 19],
];
const heatValues = [
  0.18, 0.34, 0.22, 0.52, 0.31, 0.68, 0.42, 0.25, 0.46, 0.61, 0.38, 0.73, 0.51, 0.29, 0.42, 0.58,
  0.33, 0.66, 0.79, 0.55, 0.36, 0.27, 0.49, 0.71, 0.86, 0.64, 0.44, 0.32, 0.54, 0.62, 0.77, 0.93,
  0.69, 0.48, 0.35,
];
const scatterPoints: Array<[number, number, number]> = [
  [16, 56, 2.4],
  [27, 47, 2.1],
  [34, 50, 2.8],
  [43, 34, 2.2],
  [52, 39, 2.7],
  [61, 22, 2.4],
  [70, 29, 3],
  [79, 16, 2.3],
  [88, 22, 2.8],
  [99, 12, 2.5],
];
const bubblePoints: Array<[number, number, number, string]> = [
  [23, 52, 7, '#5b8ff9'],
  [42, 41, 10, '#7dc6ff'],
  [62, 49, 6, '#61c7b8'],
  [77, 31, 8, '#bb8ee8'],
  [94, 19, 5, '#f4a76f'],
];
const stackBars: Array<[number, number, number, number]> = [
  [18, 18, 13, 10],
  [25, 11, 20, 12],
  [29, 8, 17, 15],
  [21, 15, 14, 18],
  [27, 12, 19, 11],
];
</script>

<template>
  <span class="chart-thumbnail" role="img" :aria-label="`${type} chart preview`">
    <svg viewBox="0 0 120 78" focusable="false">
      <g class="chart-thumbnail__grid">
        <line v-for="value in 4" :key="`h-${value}`" x1="8" :y1="14 + value * 13" x2="112" />
        <line
          v-for="value in 5"
          :key="`v-${value}`"
          :x1="8 + value * 17"
          y1="10"
          :x2="8 + value * 17"
          y2="68"
        />
      </g>

      <template v-if="type === 'line'">
        <polyline
          class="chart-thumbnail__line"
          points="10,58 24,53 38,41 52,46 66,27 80,34 94,19 109,23"
        />
        <circle
          v-for="point in lineDots"
          :key="point.join('-')"
          class="chart-thumbnail__dot"
          :cx="point[0]"
          :cy="point[1]"
          r="2.2"
        />
      </template>

      <template v-else-if="type === 'bar'">
        <rect
          v-for="(height, index) in bars"
          :key="height"
          class="chart-thumbnail__bar"
          :x="10 + index * 15"
          :y="66 - height"
          width="9"
          :height="height"
          rx="2"
        />
      </template>

      <template v-else-if="type === 'pie'">
        <circle class="chart-thumbnail__pie-base" cx="60" cy="39" r="25" />
        <circle class="chart-thumbnail__pie-blue" cx="60" cy="39" r="25" />
        <circle class="chart-thumbnail__pie-green" cx="60" cy="39" r="25" />
        <circle class="chart-thumbnail__pie-gold" cx="60" cy="39" r="25" />
      </template>

      <template v-else-if="type === 'scatter'">
        <circle
          v-for="point in scatterPoints"
          :key="point.join('-')"
          class="chart-thumbnail__scatter"
          :cx="point[0]"
          :cy="point[1]"
          :r="point[2]"
        />
      </template>

      <template v-else-if="type === 'heat'">
        <rect
          v-for="(value, index) in heatValues"
          :key="index"
          class="chart-thumbnail__heat"
          :x="10 + (index % 7) * 15"
          :y="13 + Math.floor(index / 7) * 11"
          width="11"
          height="7"
          rx="1.5"
          :opacity="value"
        />
      </template>

      <template v-else-if="type === 'bubble'">
        <circle
          v-for="point in bubblePoints"
          :key="point.join('-')"
          class="chart-thumbnail__bubble"
          :cx="point[0]"
          :cy="point[1]"
          :r="point[2]"
          :fill="point[3]"
        />
      </template>

      <template v-else-if="type === 'word'">
        <text x="18" y="29" class="chart-thumbnail__word chart-thumbnail__word--xl">GROWTH</text>
        <text x="60" y="22" class="chart-thumbnail__word chart-thumbnail__word--blue">INSIGHT</text>
        <text x="34" y="47" class="chart-thumbnail__word chart-thumbnail__word--green">METRIC</text>
        <text x="72" y="44" class="chart-thumbnail__word chart-thumbnail__word--orange">VALUE</text>
        <text x="20" y="61" class="chart-thumbnail__word chart-thumbnail__word--muted">REPORT</text>
        <text x="76" y="62" class="chart-thumbnail__word chart-thumbnail__word--muted">TREND</text>
      </template>

      <template v-else-if="type === 'sankey'">
        <rect x="10" y="14" width="7" height="32" rx="2" class="chart-thumbnail__sankey-a" />
        <rect x="104" y="11" width="7" height="18" rx="2" class="chart-thumbnail__sankey-b" />
        <rect x="104" y="36" width="7" height="29" rx="2" class="chart-thumbnail__sankey-c" />
        <path
          d="M17,19 C49,19 68,15 104,15 L104,25 C72,25 51,29 17,31 Z"
          class="chart-thumbnail__sankey-a"
        />
        <path
          d="M17,34 C48,36 72,44 104,43 L104,59 C72,57 49,51 17,45 Z"
          class="chart-thumbnail__sankey-c"
        />
      </template>

      <template v-else-if="type === 'stream'">
        <path
          class="chart-thumbnail__stream-blue"
          d="M8,48 C22,39 34,52 48,43 C62,34 75,39 89,29 C98,23 105,25 112,21 L112,39 C103,43 96,41 88,46 C74,56 61,50 49,57 C37,65 24,55 8,63 Z"
        />
        <path
          class="chart-thumbnail__stream-green"
          d="M8,57 C21,50 33,59 47,49 C61,39 74,45 88,37 C98,32 105,33 112,29 L112,45 C103,49 96,47 88,52 C74,62 61,56 49,63 C37,70 24,61 8,68 Z"
        />
        <path
          class="chart-thumbnail__stream-gold"
          d="M8,63 C21,57 34,66 48,57 C62,48 75,54 89,45 C99,39 105,40 112,36 L112,69 L8,69 Z"
        />
      </template>

      <template v-else-if="type === 'radar'">
        <polygon points="60,10 96,32 84,64 36,64 24,32" class="chart-thumbnail__radar-grid" />
        <polygon
          points="60,23 82,37 74,55 45,55 38,37"
          class="chart-thumbnail__radar-grid chart-thumbnail__radar-grid--inner"
        />
        <polygon points="60,15 88,34 78,60 40,56 30,34" class="chart-thumbnail__radar-area" />
        <circle class="chart-thumbnail__radar-dot" cx="60" cy="15" r="2.3" />
        <circle class="chart-thumbnail__radar-dot" cx="88" cy="34" r="2.3" />
        <circle class="chart-thumbnail__radar-dot" cx="78" cy="60" r="2.3" />
        <circle class="chart-thumbnail__radar-dot" cx="40" cy="56" r="2.3" />
        <circle class="chart-thumbnail__radar-dot" cx="30" cy="34" r="2.3" />
      </template>

      <template v-else-if="type === 'stack'">
        <g v-for="(segments, index) in stackBars" :key="index">
          <rect
            :x="11 + index * 20"
            :y="66 - segments[0] - segments[1] - segments[2] - segments[3]"
            width="12"
            :height="segments[0]"
            rx="2"
            fill="#4c84ff"
          />
          <rect
            :x="11 + index * 20"
            :y="66 - segments[1] - segments[2] - segments[3]"
            width="12"
            :height="segments[1]"
            fill="#66c7b3"
          />
          <rect
            :x="11 + index * 20"
            :y="66 - segments[2] - segments[3]"
            width="12"
            :height="segments[2]"
            fill="#f2b84b"
          />
          <rect
            :x="11 + index * 20"
            :y="66 - segments[3]"
            width="12"
            :height="segments[3]"
            fill="#e87857"
          />
        </g>
      </template>

      <template v-else-if="type === 'sunburst'">
        <circle cx="60" cy="39" r="13" class="chart-thumbnail__sunburst-center" />
        <circle
          cx="60"
          cy="39"
          r="20"
          class="chart-thumbnail__sunburst-ring chart-thumbnail__sunburst-ring--blue"
        />
        <circle
          cx="60"
          cy="39"
          r="28"
          class="chart-thumbnail__sunburst-ring chart-thumbnail__sunburst-ring--green"
        />
        <circle
          cx="60"
          cy="39"
          r="35"
          class="chart-thumbnail__sunburst-ring chart-thumbnail__sunburst-ring--gold"
        />
      </template>
    </svg>
  </span>
</template>

<style scoped>
.chart-thumbnail,
.chart-thumbnail svg {
  display: block;
  width: 100%;
  height: 100%;
}

.chart-thumbnail__grid line {
  stroke: #e7edf5;
  stroke-width: 0.8;
}

.chart-thumbnail__line {
  fill: none;
  stroke: #4c84ff;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.5;
}

.chart-thumbnail__dot {
  fill: #fff;
  stroke: #4c84ff;
  stroke-width: 2;
}

.chart-thumbnail__bar {
  fill: #25ae7d;
}

.chart-thumbnail__pie-base,
.chart-thumbnail__pie-blue,
.chart-thumbnail__pie-green,
.chart-thumbnail__pie-gold {
  fill: none;
  stroke-linecap: butt;
  stroke-width: 17;
  transform: rotate(-90deg);
  transform-origin: 60px 39px;
}

.chart-thumbnail__pie-base {
  stroke: #f3b13f;
}

.chart-thumbnail__pie-blue {
  stroke: #4c84ff;
  stroke-dasharray: 62 95;
}

.chart-thumbnail__pie-green {
  stroke: #3fc59a;
  stroke-dasharray: 46 111;
  stroke-dashoffset: -62;
}

.chart-thumbnail__pie-gold {
  stroke: #f3b13f;
  stroke-dasharray: 49 108;
  stroke-dashoffset: -108;
}

.chart-thumbnail__scatter {
  fill: #ef744b;
}

.chart-thumbnail__heat {
  fill: #ef8d35;
}

.chart-thumbnail__bubble {
  opacity: 0.62;
  stroke: #fff;
  stroke-width: 1.2;
}

.chart-thumbnail__word {
  fill: #9aa8bb;
  font-family: Arial, sans-serif;
  font-size: 7px;
  font-weight: 800;
}

.chart-thumbnail__word--xl {
  fill: #ef744b;
  font-size: 10px;
}

.chart-thumbnail__word--blue {
  fill: #4c84ff;
  font-size: 8px;
}

.chart-thumbnail__word--green {
  fill: #35b98d;
  font-size: 8px;
}

.chart-thumbnail__word--orange {
  fill: #f2a23d;
}

.chart-thumbnail__word--muted {
  font-size: 6px;
}

.chart-thumbnail__sankey-a,
.chart-thumbnail__sankey-b,
.chart-thumbnail__sankey-c {
  stroke: none;
}

.chart-thumbnail__sankey-a {
  fill: #4c84ff;
  opacity: 0.52;
}

.chart-thumbnail__sankey-b {
  fill: #45c69b;
  opacity: 0.72;
}

.chart-thumbnail__sankey-c {
  fill: #f0ae42;
  opacity: 0.62;
}

.chart-thumbnail__stream-blue,
.chart-thumbnail__stream-green,
.chart-thumbnail__stream-gold {
  stroke: none;
}

.chart-thumbnail__stream-blue {
  fill: #4c84ff;
  opacity: 0.62;
}

.chart-thumbnail__stream-green {
  fill: #42c49a;
  opacity: 0.62;
}

.chart-thumbnail__stream-gold {
  fill: #f0b146;
  opacity: 0.62;
}

.chart-thumbnail__radar-grid {
  fill: #f2f6fb;
  stroke: #b8cae3;
  stroke-width: 1;
}

.chart-thumbnail__radar-grid--inner {
  fill: none;
}

.chart-thumbnail__radar-area {
  fill: #48c39a;
  fill-opacity: 0.38;
  stroke: #2eb985;
  stroke-width: 2;
}

.chart-thumbnail__radar-dot {
  fill: #2eb985;
}

.chart-thumbnail__sunburst-center {
  fill: #4c84ff;
}

.chart-thumbnail__sunburst-ring {
  fill: none;
  stroke-width: 9;
}

.chart-thumbnail__sunburst-ring--blue {
  stroke: #4c84ff;
  stroke-dasharray: 62 64;
}

.chart-thumbnail__sunburst-ring--green {
  stroke: #3dc39a;
  stroke-dasharray: 58 118;
  stroke-dashoffset: -45;
}

.chart-thumbnail__sunburst-ring--gold {
  stroke: #f0b247;
  stroke-dasharray: 76 144;
  stroke-dashoffset: -90;
}
</style>
