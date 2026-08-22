# Skip instrument widgets (MIT)

Visual instrument components ported from [halos-org/skip](https://github.com/halos-org/skip)
(`@halos-org/skip`, MIT License).

| File | Skip source |
|------|-------------|
| `svg-windsteer.component.*` | `skip/src/app/widgets/svg-windsteer/` |
| `svg-animate.util.ts` | `skip/src/app/core/utils/svg-animate.util.ts` |
| `wind-steer.util.ts` | `skip/src/app/widgets/widget-windsteer/` (helpers) |

Cattitude wraps these with `InstrumentLiveService` and vessel path mappings —
no Skip dashboard shell or iframe.
