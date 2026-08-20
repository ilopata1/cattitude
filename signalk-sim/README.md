# Signal K test simulator

Standalone WebSocket server that speaks the Signal K delta protocol. Use it to
exercise Cattitude's Anchorage, Polar, and sail-plan pages without a boat.

## Setup

```bash
cd signalk-sim
npm install
node generator.js
```

Default scenario is **`sailing`**: own vessel (MMSI `123456789`) steaming a
TWA sweep with TWS and STW derived from the Outremer 55 polar.

Point Cattitude **Settings → Signal-K Server URL** at `http://localhost:3000`.

## Usage

```bash
node generator.js [scenario] [--speed <multiplier>] [--port <port>]
```

| Option | Default | Description |
|---|---|---|
| `scenario` | `sailing` | See list below |
| `--speed` | `60` | Time multiplier for anchorage steps (`fast` = 60). Sailing scenarios tick at ~1 s regardless. |
| `--port` | `3000` | Listen port |

Stream URL: `ws://localhost:3000/signalk/v1/stream`

## Scenarios

**Sailing / polar**

| Name | What it does |
|---|---|
| `sailing` | Loop: TWA 55–150°, TWS 12–18 kn, STW ~93% of polar, dip to 72% mid-run |
| `polar_underperform` | Hold beam reach; polar % falls then recovers |
| `sail_crossover` | Walk TWA×TWS bands so sail-plan advice changes (jib, Code 0, gennaker, A2, S4, heavy weather) |

**Anchorage (from SwingCircle)**

| Name | What it does |
|---|---|
| `demo` | 12-vessel Plymouth Sound anchorage (loops) |
| `green_to_red` | Two vessels: green → amber → red via drag |
| `amber_only` | Stable amber pair |
| `sog_filter` | SOG spikes excluded from anchor calc |
| `heading_vs_cog` | Heading vs COG-only fallback |
| `convergence` | Confidence grows low → high |
| `noisy_heading` | Heading noise |
| `multi_vessel` | Five vessels, mixed states |
| `all` | Cycle non-looping scenarios |

Examples:

```bash
node generator.js sailing
node generator.js demo --speed 30
node generator.js sail_crossover
node generator.js all --port 3001
```
