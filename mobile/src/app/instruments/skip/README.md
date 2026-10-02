# Skip instrument widgets (MIT)

Visual instrument components ported from [halos-org/skip](https://github.com/halos-org/skip)
(`@halos-org/skip`, MIT License).

| File | Skip source |
|------|-------------|
| `svg-windsteer.component.*` | `skip/src/app/widgets/svg-windsteer/` |
| `svg-animate.util.ts` | `skip/src/app/core/utils/svg-animate.util.ts` |
| `wind-steer.util.ts` | `skip/src/app/widgets/widget-windsteer/` (helpers) |

Cattitude wraps these with `InstrumentLiveService` and vessel path mappings.
The Skip dashboard is not built or shipped with the PWA. If the full Skip app
is needed again, maintain a fork with patches committed. Do not regex-patch
upstream sources at deploy time.
