# Cattitude logbook recorder

Signal K plugin that writes Clever Sailor log entries while the server is running. Entries are stored by `signalk-logbook` and read back by the Clever Sailor app.

Install `signalk-logbook` and `signalk-autostate` from the Signal K app store first, and enable both. This plugin is not in the store.

On this boat Signal K runs as an NSSM service without `HOME` set, so the settings directory is the server program folder, not `.signalk`. The plugin has to sit inside that folder's own `node_modules`, one level below `signalk-server`, not beside it:

`C:\Users\conta\AppData\Roaming\npm\node_modules\signalk-server\node_modules\signalk-cattitude-logbook`

Confirm that `signalk-server` itself contains `settings.json`. Restart Signal K. The plugin does not appear in the App Store. Enable **Cattitude logbook recorder** under Server → Plugin Config.

The recorder uses the interval, offset, passage, sail set, and duty rota published by the Clever Sailor app. It writes the watch-change rows itself from that rota. Phones publish sail changes and the rota, and do not write their own interval, propulsion, sail, or watch rows. Until a phone or the navstation has opened the logbook once, it uses a 3-hour interval and pauses 15 minutes after the boat is anchored or stopped.

Polar samples are taken on the boat once a second for the last hour, including while no phone has the polar page open. The app reads them from `GET /plugins/cattitude-logbook/polar`. Restart Signal K after updating this plugin so that history starts recording.

`signalk-logbook` also writes its own hourly, engine, and alarm lines. Those stay in the Signal K logbook web app. Clever Sailor shows the rows this recorder writes, plus manual lines.

The boat holds one copy of the passage, duty rota, sail set, and logbook settings, each with a revision number. A phone sends a part only when someone changes it there, together with the revision it started from. If another device changed that part first, the boat refuses it with `409` and the phone takes the boat's copy. Phones read `/status` every 30 s to pick up changes from other devices. `/status` also returns the boat's own time, so a phone with a wrong clock still sees the recorder as running. Restart Signal K after updating this plugin.
