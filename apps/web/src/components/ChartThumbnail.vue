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

      <template v-else-if="type === 'area'">
        <path
          class="chart-thumbnail__area-fill"
          d="M8,54 C22,45 34,51 48,39 C62,27 76,36 90,25 C99,18 106,20 112,16 L112,68 L8,68 Z"
        />
        <polyline
          class="chart-thumbnail__line"
          points="8,54 22,45 34,51 48,39 62,27 76,36 90,25 99,18 112,16"
        />
      </template>

      <template v-else-if="type === 'funnel'">
        <path
          class="chart-thumbnail__funnel chart-thumbnail__funnel--blue"
          d="M16,11 H104 L92,24 H28 Z"
        />
        <path
          class="chart-thumbnail__funnel chart-thumbnail__funnel--green"
          d="M30,28 H90 L79,41 H41 Z"
        />
        <path
          class="chart-thumbnail__funnel chart-thumbnail__funnel--gold"
          d="M43,45 H77 L69,58 H51 Z"
        />
        <path
          class="chart-thumbnail__funnel chart-thumbnail__funnel--orange"
          d="M53,62 H67 L62,71 H58 Z"
        />
      </template>

      <template v-else-if="type === 'treemap'">
        <rect
          x="9"
          y="11"
          width="49"
          height="28"
          rx="2"
          class="chart-thumbnail__treemap chart-thumbnail__treemap--blue"
        />
        <rect
          x="61"
          y="11"
          width="50"
          height="17"
          rx="2"
          class="chart-thumbnail__treemap chart-thumbnail__treemap--green"
        />
        <rect
          x="61"
          y="31"
          width="24"
          height="27"
          rx="2"
          class="chart-thumbnail__treemap chart-thumbnail__treemap--gold"
        />
        <rect
          x="88"
          y="31"
          width="23"
          height="27"
          rx="2"
          class="chart-thumbnail__treemap chart-thumbnail__treemap--orange"
        />
        <rect
          x="9"
          y="42"
          width="49"
          height="26"
          rx="2"
          class="chart-thumbnail__treemap chart-thumbnail__treemap--violet"
        />
      </template>

      <template v-else-if="type === 'candlestick'">
        <g v-for="(item, index) in 7" :key="index">
          <line
            :x1="17 + index * 14"
            :y1="14 + (index % 3) * 6"
            :x2="17 + index * 14"
            :y2="65 - (index % 4) * 5"
            class="chart-thumbnail__candle-wick"
          />
          <rect
            :x="13 + index * 14"
            :y="25 + (index % 4) * 7"
            width="8"
            :height="15 + (index % 3) * 4"
            rx="1"
            :class="index % 3 === 1 ? 'chart-thumbnail__candle-down' : 'chart-thumbnail__candle-up'"
          />
        </g>
      </template>

      <template v-else-if="type === 'flow'">
        <path class="chart-thumbnail__flow-link" d="M31,25 H48 M66,25 H83 M31,53 H48 M66,53 H83" />
        <rect x="10" y="16" width="22" height="16" rx="4" class="chart-thumbnail__flow-node" />
        <rect
          x="48"
          y="16"
          width="18"
          height="16"
          rx="4"
          class="chart-thumbnail__flow-node chart-thumbnail__flow-node--decision"
        />
        <rect x="83" y="16" width="26" height="16" rx="4" class="chart-thumbnail__flow-node" />
        <rect x="10" y="44" width="22" height="16" rx="4" class="chart-thumbnail__flow-node" />
        <rect
          x="48"
          y="44"
          width="18"
          height="16"
          rx="4"
          class="chart-thumbnail__flow-node chart-thumbnail__flow-node--decision"
        />
        <rect x="83" y="44" width="26" height="16" rx="4" class="chart-thumbnail__flow-node" />
      </template>

      <template v-else-if="type === 'gantt'">
        <path class="chart-thumbnail__gantt-link" d="M32,21 V50 H48" />
        <rect
          x="11"
          y="14"
          width="36"
          height="9"
          rx="3"
          class="chart-thumbnail__gantt chart-thumbnail__gantt--blue"
        />
        <rect
          x="28"
          y="31"
          width="54"
          height="9"
          rx="3"
          class="chart-thumbnail__gantt chart-thumbnail__gantt--green"
        />
        <rect
          x="48"
          y="50"
          width="44"
          height="9"
          rx="3"
          class="chart-thumbnail__gantt chart-thumbnail__gantt--gold"
        />
        <rect
          x="71"
          y="66"
          width="30"
          height="9"
          rx="3"
          class="chart-thumbnail__gantt chart-thumbnail__gantt--orange"
        />
      </template>

      <template v-else-if="type === 'map'">
        <path
          class="chart-thumbnail__map-land"
          d="M20,24 L34,15 L49,20 L58,15 L71,23 L88,21 L103,33 L96,45 L83,48 L75,61 L58,64 L47,56 L34,58 L28,46 L17,41 Z"
        />
        <path
          class="chart-thumbnail__map-boundary"
          d="M34,58 L47,42 L61,37 L75,61 M47,42 L34,28 L49,20 M61,37 L83,48"
        />
        <circle class="chart-thumbnail__map-point" cx="42" cy="31" r="3" />
        <circle
          class="chart-thumbnail__map-point chart-thumbnail__map-point--green"
          cx="69"
          cy="43"
          r="4"
        />
        <circle
          class="chart-thumbnail__map-point chart-thumbnail__map-point--gold"
          cx="86"
          cy="28"
          r="3"
        />
      </template>

      <template v-else-if="type === 'box'">
        <g v-for="(height, index) in [30, 45, 38]" :key="index">
          <line
            :x1="24 + index * 32"
            y1="11"
            :x2="24 + index * 32"
            y2="67"
            class="chart-thumbnail__box-line"
          />
          <rect
            :x="15 + index * 32"
            :y="35 - height / 2"
            width="18"
            :height="height"
            rx="2"
            class="chart-thumbnail__box"
          />
          <line
            :x1="13 + index * 32"
            :y1="28"
            :x2="35 + index * 32"
            y2="28"
            class="chart-thumbnail__box-line"
          />
          <line
            :x1="14 + index * 32"
            :y1="53"
            :x2="34 + index * 32"
            y2="53"
            class="chart-thumbnail__box-line"
          />
        </g>
      </template>

      <template v-else-if="type === 'graph'">
        <path
          class="chart-thumbnail__graph-link"
          d="M31,26 L53,17 L82,28 L92,52 L62,62 L38,55 L18,40 L31,26 M53,17 L62,62 M31,26 L38,55 M82,28 L38,55"
        />
        <circle class="chart-thumbnail__graph-node" cx="31" cy="26" r="6" />
        <circle
          class="chart-thumbnail__graph-node chart-thumbnail__graph-node--green"
          cx="53"
          cy="17"
          r="5"
        />
        <circle
          class="chart-thumbnail__graph-node chart-thumbnail__graph-node--gold"
          cx="82"
          cy="28"
          r="6"
        />
        <circle
          class="chart-thumbnail__graph-node chart-thumbnail__graph-node--orange"
          cx="92"
          cy="52"
          r="5"
        />
        <circle
          class="chart-thumbnail__graph-node chart-thumbnail__graph-node--violet"
          cx="62"
          cy="62"
          r="7"
        />
        <circle
          class="chart-thumbnail__graph-node chart-thumbnail__graph-node--muted"
          cx="38"
          cy="55"
          r="4"
        />
      </template>

      <template v-else-if="type === 'path'">
        <path class="chart-thumbnail__path-line" d="M12,17 H96 M12,39 H96 M12,61 H96" />
        <circle class="chart-thumbnail__path-node" cx="18" cy="17" r="4" />
        <circle class="chart-thumbnail__path-node" cx="54" cy="17" r="4" />
        <circle class="chart-thumbnail__path-node" cx="94" cy="17" r="4" />
        <circle class="chart-thumbnail__path-node" cx="32" cy="39" r="4" />
        <circle class="chart-thumbnail__path-node" cx="70" cy="39" r="4" />
        <circle class="chart-thumbnail__path-node" cx="94" cy="39" r="4" />
        <circle class="chart-thumbnail__path-node" cx="18" cy="61" r="4" />
        <circle class="chart-thumbnail__path-node" cx="48" cy="61" r="4" />
        <circle class="chart-thumbnail__path-node" cx="86" cy="61" r="4" />
      </template>

      <template v-else-if="type === 'tree'">
        <path
          class="chart-thumbnail__tree-link"
          d="M60,17 V30 M30,30 H90 M30,30 V42 M60,30 V46 M90,30 V42 M15,42 H45 M75,42 H105"
        />
        <circle
          class="chart-thumbnail__tree-node chart-thumbnail__tree-node--root"
          cx="60"
          cy="15"
          r="5"
        />
        <circle class="chart-thumbnail__tree-node" cx="30" cy="30" r="4" />
        <circle class="chart-thumbnail__tree-node" cx="60" cy="30" r="4" />
        <circle class="chart-thumbnail__tree-node" cx="90" cy="30" r="4" />
        <circle
          class="chart-thumbnail__tree-node chart-thumbnail__tree-node--leaf"
          cx="15"
          cy="42"
          r="3"
        />
        <circle
          class="chart-thumbnail__tree-node chart-thumbnail__tree-node--leaf"
          cx="45"
          cy="42"
          r="3"
        />
        <circle
          class="chart-thumbnail__tree-node chart-thumbnail__tree-node--leaf"
          cx="75"
          cy="42"
          r="3"
        />
        <circle
          class="chart-thumbnail__tree-node chart-thumbnail__tree-node--leaf"
          cx="105"
          cy="42"
          r="3"
        />
      </template>

      <template v-else-if="type === 'parallel'">
        <line
          v-for="x in [18, 42, 66, 92]"
          :key="x"
          :x1="x"
          y1="12"
          :x2="x"
          y2="68"
          class="chart-thumbnail__parallel-axis"
        />
        <polyline
          class="chart-thumbnail__parallel chart-thumbnail__parallel--blue"
          points="18,24 42,43 66,30 92,16"
        />
        <polyline
          class="chart-thumbnail__parallel chart-thumbnail__parallel--green"
          points="18,38 42,25 66,54 92,28"
        />
        <polyline
          class="chart-thumbnail__parallel chart-thumbnail__parallel--gold"
          points="18,58 42,49 66,32 92,61"
        />
      </template>

      <template v-else-if="type === 'gauge'">
        <path class="chart-thumbnail__gauge-track" d="M17,58 A43,43 0 0 1 103,58" />
        <path class="chart-thumbnail__gauge-value" d="M17,58 A43,43 0 0 1 79,20" />
        <line class="chart-thumbnail__gauge-needle" x1="60" y1="59" x2="80" y2="29" />
        <circle class="chart-thumbnail__gauge-center" cx="60" cy="59" r="5" />
      </template>

      <template v-else-if="type === 'calendar'">
        <rect
          v-for="(value, index) in heatValues.slice(0, 28)"
          :key="index"
          :x="12 + (index % 7) * 14"
          :y="12 + Math.floor(index / 7) * 15"
          width="10"
          height="10"
          rx="1.5"
          class="chart-thumbnail__calendar"
          :opacity="value"
        />
      </template>

      <template v-else-if="type === 'matrix'">
        <g v-for="(value, index) in heatValues.slice(0, 24)" :key="index">
          <rect
            :x="14 + (index % 6) * 16"
            :y="14 + Math.floor(index / 6) * 12"
            width="12"
            height="8"
            rx="1.5"
            class="chart-thumbnail__matrix"
            :opacity="value"
          />
        </g>
      </template>

      <template v-else-if="type === 'chord'">
        <circle class="chart-thumbnail__chord-ring" cx="60" cy="39" r="31" />
        <path
          class="chart-thumbnail__chord-link chart-thumbnail__chord-link--blue"
          d="M37,17 C60,28 70,51 88,58 C60,78 30,50 37,17 Z"
        />
        <path
          class="chart-thumbnail__chord-link chart-thumbnail__chord-link--green"
          d="M88,20 C72,34 49,48 31,58 C52,80 89,54 88,20 Z"
        />
        <circle
          class="chart-thumbnail__chord-dot chart-thumbnail__chord-dot--blue"
          cx="35"
          cy="19"
          r="5"
        />
        <circle
          class="chart-thumbnail__chord-dot chart-thumbnail__chord-dot--green"
          cx="89"
          cy="21"
          r="5"
        />
        <circle
          class="chart-thumbnail__chord-dot chart-thumbnail__chord-dot--gold"
          cx="89"
          cy="58"
          r="5"
        />
        <circle
          class="chart-thumbnail__chord-dot chart-thumbnail__chord-dot--orange"
          cx="31"
          cy="58"
          r="5"
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

.chart-thumbnail__area-fill {
  fill: #4c84ff;
  fill-opacity: 0.25;
}

.chart-thumbnail__funnel {
  stroke: #fff;
  stroke-width: 1;
}

.chart-thumbnail__funnel--blue {
  fill: #4c84ff;
}

.chart-thumbnail__funnel--green {
  fill: #3dc39a;
}

.chart-thumbnail__funnel--gold {
  fill: #f0b247;
}

.chart-thumbnail__funnel--orange {
  fill: #ef744b;
}

.chart-thumbnail__treemap {
  stroke: #fff;
  stroke-width: 2;
}

.chart-thumbnail__treemap--blue {
  fill: #4c84ff;
}

.chart-thumbnail__treemap--green {
  fill: #3dc39a;
}

.chart-thumbnail__treemap--gold {
  fill: #f0b247;
}

.chart-thumbnail__treemap--orange {
  fill: #ef744b;
}

.chart-thumbnail__treemap--violet {
  fill: #9a6dde;
}

.chart-thumbnail__candle-wick {
  stroke: #8a97a8;
  stroke-width: 1.4;
}

.chart-thumbnail__candle-up {
  fill: #3dc39a;
}

.chart-thumbnail__candle-down {
  fill: #ef744b;
}

.chart-thumbnail__flow-link {
  fill: none;
  stroke: #9eb6d8;
  stroke-width: 1.6;
}

.chart-thumbnail__flow-node {
  fill: #dceaff;
  stroke: #4c84ff;
  stroke-width: 1.4;
}

.chart-thumbnail__flow-node--decision {
  fill: #fff3d9;
  stroke: #edaa32;
}

.chart-thumbnail__gantt-link {
  fill: none;
  stroke: #bfcad8;
  stroke-width: 1;
}

.chart-thumbnail__gantt {
  opacity: 0.88;
}

.chart-thumbnail__gantt--blue {
  fill: #4c84ff;
}

.chart-thumbnail__gantt--green {
  fill: #3dc39a;
}

.chart-thumbnail__gantt--gold {
  fill: #f0b247;
}

.chart-thumbnail__gantt--orange {
  fill: #ef744b;
}

.chart-thumbnail__map-land {
  fill: #dff3eb;
  stroke: #68b99d;
  stroke-width: 1.4;
}

.chart-thumbnail__map-boundary {
  fill: none;
  stroke: #a9d8c8;
  stroke-width: 1;
}

.chart-thumbnail__map-point {
  fill: #4c84ff;
  stroke: #fff;
  stroke-width: 1.3;
}

.chart-thumbnail__map-point--green {
  fill: #3dc39a;
}

.chart-thumbnail__map-point--gold {
  fill: #f0b247;
}

.chart-thumbnail__box-line {
  stroke: #7e91ab;
  stroke-width: 1.3;
}

.chart-thumbnail__box {
  fill: #dceaff;
  stroke: #4c84ff;
  stroke-width: 1.3;
}

.chart-thumbnail__graph-link {
  fill: none;
  stroke: #a8b9d0;
  stroke-width: 1.3;
}

.chart-thumbnail__graph-node {
  fill: #4c84ff;
  stroke: #fff;
  stroke-width: 1.5;
}

.chart-thumbnail__graph-node--green {
  fill: #3dc39a;
}

.chart-thumbnail__graph-node--gold {
  fill: #f0b247;
}

.chart-thumbnail__graph-node--orange {
  fill: #ef744b;
}

.chart-thumbnail__graph-node--violet {
  fill: #9a6dde;
}

.chart-thumbnail__graph-node--muted {
  fill: #8b9aae;
}

.chart-thumbnail__path-line {
  fill: none;
  stroke: #b7c7dd;
  stroke-width: 1.7;
}

.chart-thumbnail__path-node {
  fill: #4c84ff;
  stroke: #fff;
  stroke-width: 1.3;
}

.chart-thumbnail__tree-link {
  fill: none;
  stroke: #a9b9cf;
  stroke-width: 1.4;
}

.chart-thumbnail__tree-node {
  fill: #f0b247;
  stroke: #fff;
  stroke-width: 1.2;
}

.chart-thumbnail__tree-node--root {
  fill: #4c84ff;
}

.chart-thumbnail__tree-node--leaf {
  fill: #3dc39a;
}

.chart-thumbnail__parallel-axis {
  stroke: #c7d3e2;
  stroke-width: 1;
}

.chart-thumbnail__parallel {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.1;
}

.chart-thumbnail__parallel--blue {
  stroke: #4c84ff;
}

.chart-thumbnail__parallel--green {
  stroke: #3dc39a;
}

.chart-thumbnail__parallel--gold {
  stroke: #f0b247;
}

.chart-thumbnail__gauge-track,
.chart-thumbnail__gauge-value {
  fill: none;
  stroke-linecap: round;
}

.chart-thumbnail__gauge-track {
  stroke: #dfe8f5;
  stroke-width: 9;
}

.chart-thumbnail__gauge-value {
  stroke: #4c84ff;
  stroke-width: 9;
}

.chart-thumbnail__gauge-needle {
  stroke: #ef744b;
  stroke-linecap: round;
  stroke-width: 3;
}

.chart-thumbnail__gauge-center {
  fill: #ef744b;
}

.chart-thumbnail__calendar {
  fill: #4c84ff;
}

.chart-thumbnail__matrix {
  fill: #3dc39a;
}

.chart-thumbnail__chord-ring {
  fill: none;
  stroke: #b8cae3;
  stroke-width: 2.4;
}

.chart-thumbnail__chord-link {
  fill-opacity: 0.22;
  stroke-width: 1.2;
}

.chart-thumbnail__chord-link--blue {
  fill: #4c84ff;
  stroke: #4c84ff;
}

.chart-thumbnail__chord-link--green {
  fill: #3dc39a;
  stroke: #3dc39a;
}

.chart-thumbnail__chord-dot {
  stroke: #fff;
  stroke-width: 1.3;
}

.chart-thumbnail__chord-dot--blue {
  fill: #4c84ff;
}

.chart-thumbnail__chord-dot--green {
  fill: #3dc39a;
}

.chart-thumbnail__chord-dot--gold {
  fill: #f0b247;
}

.chart-thumbnail__chord-dot--orange {
  fill: #ef744b;
}
</style>
