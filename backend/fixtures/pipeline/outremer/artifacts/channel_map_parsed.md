# Channel map — parsed for adjudication

> **STOP:** Do not commit `channel_entries` / `device_locations` as
> vessel facts until this table is adjudicated against the PDF.

## Citation

- **Source doc:** Owners' manual 55N60 / OUTREMER YACHTING
- **Page:** 46
- **Boat model:** OUT55N60
- **Version:** Offshore / MFS Custom : Bureau Lit
- **Revision:** 05/05/2026 Ind C
- **Title (verbatim):** C-ZONE CHANELS

## Device locations

| device_instance | kind | zone FR | zone EN | hull_side | address | confidence | notes |
|---|---|---|---|---|---|---|---|
| COI n°2 | coi | Bâbord | Port | port | 1000 0010 | clear |  |
| COI n°1 | coi | Carré | Salon | center | 1000 0001 | clear |  |
| COI n°3 | coi | Tribord | Starboard | stbd | 1000 0011 | clear |  |
| Screen Touch7 | Touch Screen |  |  |  | 0010 0111 | clear |  |
| Wifi Touch7 | WiFi Module |  |  |  | 0001 0111 | clear |  |
| DC500 n°0 | DC500 |  |  |  |  | clear |  |
| DC500 n°1 | DC500 |  |  |  |  | clear |  |
| DC500 n°2 | DC500 |  |  |  |  | clear |  |
| DC500 n°3 | DC500 |  |  |  |  | clear |  |
| Fuse Box 01 Carré | fuse_box | Carré | Salon | center |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| Fuse Box 02 BD Arrière | fuse_box | BD Arrière | Port Aft | port |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| Fuse Box 03 BD Avant | fuse_box | BD Avant | Port Forward | port |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| Fuse Box 04 TD Arrière | fuse_box | TD Arrière | Starboard Aft | stbd |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| Fuse Box 05 TD Avant | fuse_box | TD Avant | Starboard Forward | stbd |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| Portes-Fusible | fuse_holder |  |  |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |

## Channel entries (by device)

### COI n°1

| ref | pin | FR | EN | fuse | flag | zone | block | conf | notes |
|---|---|---|---|---|---|---|---|---|---|
| COI1-O1 | 1 | Réfrigérateur | Fridge |  | STD |  | high_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-O2 | 2 | [OPT] Conservateur | [OPT] Freezer |  | OPT |  | high_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-O3 | 3 | — (empty) | — (empty) |  | STD |  | high_current | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| COI1-O4 | 4 | [OPT] Zeus x2 | [OPT] Zeus x2 |  | OPT |  | high_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-O5 | 1 | Eclairage Carré Bâbord | Lights - Salon PORT |  | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-O6 | 2 | Eclairage Carré Tribord | Lights - Salon STBD |  | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-O7 | 3 | [OPT] Commande Guindeau | [OPT] Windlass |  | OPT |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-O8 | 4 | Feu de navigation | Navigation Light |  | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-O9 | 5 | Eclairage Rouge | Red lights |  | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-O10 | 6 | Feu de Mouillage | Anchor Light |  | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-O11 | 7 | Feu de Hune | Steaming Light |  | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-O12 | 8 | Feu de Pont | Deck Light |  | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-O13 | 9 | Commande Chauffe EAU | Water Heater ON/OFF |  | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-O14 | 10 | [OPT] Electronique | [OPT] Electronic |  | OPT |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-O15 | 11 | [OPT] Wifi | [OPT] Wifi |  | OPT |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-O16 | 12 | [OPT] Radar | [OPT] Radar |  | OPT |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-A1 | 1 | BP Eclairage Carré Bâbord | Lights SW - Salon PORT |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-A2 | 2 | BP Eclairage Carré Tribord | Lights SW - Salon STBD |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-A3 | 3 | BP Ecl. Ambiance Carré | Lights SW - Salon Courtesy |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-A4 | 4 | BP Eclairage Cockpit Bimini | Lights SW - Cockpit |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-A5 | 5 | Jauge Gasoil BD | Fuel Tank PORT |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-A6 | 6 | Jauge Gasoil TD | Fuel Tank STBD |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-A7 | 7 | Alarme Pompes de Cale BD | Bilge Pump Running - PORT |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI1-A8 | 8 | Alarme Pompes de Cale TD | Bilge Pump Running - STBD |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |

### COI n°3

| ref | pin | FR | EN | fuse | flag | zone | block | conf | notes |
|---|---|---|---|---|---|---|---|---|---|
| COI3-O1 | 1 | — (empty) | — (empty) |  | STD |  | high_current | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| COI3-O2 | 2 | — (empty) | — (empty) |  | STD |  | high_current | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| COI3-O3 | 3 | — (empty) | — (empty) |  | STD |  | high_current | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| COI3-O4 | 4 | Pompe ED TD | Pump - Fresh Water STBD | 25 | STD |  | high_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI3-O5 | 1 | Pompe de Cale TD01 | Bilge Pump STBD01 - Bilge | 5 | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI3-O6 | 2 | Pompe de Cale TD02 | Bilge Pump STBD02 - Engine Room | 5 | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI3-O7 | 3 | Pompe de Cale TD03 | Bilge Pump STBD03 - Engine Room | 5 | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI3-O8 | 4 | Eclairage Cab Ar | Lights - Aft Cabin STBD | 2 | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI3-O9 | 5 | Eclairage Ambiance Coursive | Lights - Courtesy STBD | 2 | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI3-O10 | 6 | Eclairage Coursive | Lights - Companion Way STBD | 2 | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI3-O11 | 7 | Eclairage Cab AV (Offshore) | Lights - Fwd Cabin STBD | 2 | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI3-O12 | 8 | Ecl. Ambiance Carré* | Lights - Salon Courtesy | 5 | CUS |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI3-O13 | 9 | Eclairage Cockpit | Lights - Cockpit | 3 | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI3-O14 | 10 | Ecl. Ambiance Carré* | Lights - Salon Courtesy | 5 | CUS |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI3-O15 | 11 | [OPT] Courtoisie Jupes | [OPT] Step Lights - STBD | 2 | OPT |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI3-O16 | 12 | — (empty) | — (empty) |  | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| COI3-A1 | 1 | BP Eclairage Cab Ar | Lights SW - Aft Cabin STBD |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI3-A2 | 2 | BP Eclairage Ambiance Coursive | Lights SW - Courtesy STBD |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI3-A3 | 3 | BP Eclairage Cousive | Lights SW - Companion Way STBD |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI3-A4 | 4 | BP Eclairage SDB TD | Lights SW - Bathroom STBD |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI3-A5 | 5 | BP Eclairage Cab AV (Offshore) | Lights SW - Fwd Cabin |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI3-A6 | 6 | — (empty) | — (empty) |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| COI3-A7 | 7 | Jauge Eau Douce TD | Fresh Water Tank STBD |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI3-A8 | 8 | Jauge Eaux Noires TD | Black Water Tank STBD |  | STD |  | analogue_input | ambiguous | adjudication overlay (this sheet) — not an extraction rule; A8 black-water — confirm (A6 blank shifted A7/A8) |

### COI n°2

| ref | pin | FR | EN | fuse | flag | zone | block | conf | notes |
|---|---|---|---|---|---|---|---|---|---|
| COI2-O1 | 1 | — (empty) | — (empty) |  | STD |  | high_current | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| COI2-O2 | 2 | Alim Pilote | Auto Pilot | 25 | STD |  | high_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-O3 | 3 | [OPT] Lave Pont | [OPT] Deck Wash | 25 | OPT |  | high_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-O4 | 4 | Pompe ED BD | Pump - Fresh Water PORT | 25 | STD |  | high_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-O5 | 1 | Pompe de Cale BD01 | Bilge Pump PORT01 - Bilge | 5 | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-O6 | 2 | Pompe de Cale BD02 | Bilge Pump PORT02 - Engine Room | 5 | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-O7 | 3 | Pompe de Cale BD03 | Bilge Pump PORT03 - Engine Room | 5 | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-O8 | 4 | Eclairage Cab Ar | Lights - Aft Cabin PORT | 2 | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-O9 | 5 | Eclairage Ambiance Coursive | Lights - Courtesy PORT | 2 | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-O10 | 6 | Eclairage Cousive | Lights - Companion Way PORT | 2 | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-O11 | 7 | Eclairage SDB BD AR | Lights - Aft Bathroom PORT | 2 | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-O12 | 8 | Ventilation Douche | Shower Fan - PORT | 2 | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-O13 | 9 | Pompe de Douche | Pump - Shower Drain PORT | 5 | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-O14 | 10 | — (empty) | — (empty) |  | STD |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| COI2-O15 | 11 | [OPT] Courtoisie Jupes | [OPT] Step Lights - PORT | 2 | OPT |  | low_current | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-O16 | 12 | — (empty) | — (empty) | 3 | STD |  | low_current | ambiguous | adjudication overlay (this sheet) — not an extraction rule; blank Fonction; fuse 3 printed on sheet — confirm |
| COI2-A1 | 1 | BP Eclairage Cab Ar | Lights SW - Aft Cabin PORT |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-A2 | 2 | BP Eclairage Ambiance Coursive | Lights SW - Courtesy PORT |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-A3 | 3 | BP Eclairage Coursive | Lights SW - Companion Way PORT |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-A4 | 4 | BP Eclairage SDB BD Arrière | Lights SW - Aft Bathroom PORT |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-A5 | 5 | BP Eclairage SDB BD Avant | Lights SW - WC PORT |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-A6 | 6 | BP Eclairage Cab AV BD | Lights SW - Fwd Cabin PORT |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-A7 | 7 | Jauge Eau Douce BD | Fresh Water Tank PORT |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |
| COI2-A8 | 8 | Jauge Eaux Noires BD | Black Water Tank PORT |  | STD |  | analogue_input | clear | adjudication overlay (this sheet) — not an extraction rule |

### OUTPUT INTERFACE OI n°2

| ref | pin | FR | EN | fuse | flag | zone | block | conf | notes |
|---|---|---|---|---|---|---|---|---|---|
| OI2-1 |  | [OPT] WC Electrique BD |  | 30 | OPT |  |  | ambiguous | missing FR or EN |
| OI2-2 |  | Pompe EDM BD |  | 5 | STD |  |  | ambiguous | missing FR or EN |
| OI2-3 |  | Eclairage SDB Avant BD |  | 2 | STD |  |  | ambiguous | missing FR or EN |
| OI2-4 |  | Eclairage Cab AV BD |  | 2 | STD |  |  | ambiguous | missing FR or EN |
| OI2-5 |  | Compas |  | 2 | STD |  |  | ambiguous | missing FR or EN |
| OI2-6 |  | Feu de Nav BD Sup + Poupe |  | 2 | STD |  |  | ambiguous | missing FR or EN |

### OUTPUT INTERFACE OI n°3

| ref | pin | FR | EN | fuse | flag | zone | block | conf | notes |
|---|---|---|---|---|---|---|---|---|---|
| OI3-1 |  | [OPT] WC Electrique TD |  | 30 | OPT |  |  | ambiguous | missing FR or EN |
| OI3-2 |  | Pompe EDM TD |  | 5 | STD |  |  | ambiguous | missing FR or EN |
| OI3-3 |  | Eclairage SDB TD |  | 2 | STD |  |  | ambiguous | missing FR or EN |
| OI3-4 |  | Ventilation Douche |  | 2 | STD |  |  | ambiguous | missing FR or EN |
| OI3-5 |  | Pompe de Douche |  | 5 | STD |  |  | ambiguous | missing FR or EN |
| OI3-6 |  | Feu de Navigation TD |  | 2 | STD |  |  | ambiguous | missing FR or EN |

### Fuse Box 01 Carré

| ref | pin | FR | EN | fuse | flag | zone | block | conf | notes |
|---|---|---|---|---|---|---|---|---|---|
| FB1-1 | 1 | Liseuse TAC | Salon Reading Light | 2 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| FB1-2 | 2 | USB Carré/Cockpit | USB Salon | 5 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| FB1-3 | 3 | [OPT] Ventilateurs Carré x2 | [OPT] Salon Fans | 2 | OPT |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| FB1-4 | 4 | — (empty) | — (empty) |  | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| FB1-5 | 5 | — (empty) | — (empty) |  | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| FB1-6 | 6 | Verrouillage Guillotines | Sash Window Lock | 2 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |

### Fuse Box 02 BD Arrière

| ref | pin | FR | EN | fuse | flag | zone | block | conf | notes |
|---|---|---|---|---|---|---|---|---|---|
| FB2-1 | 1 | — (empty) | — (empty) |  | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| FB2-2 | 2 | Liseuses Cab AR | Aft cabin Reading Light | 3 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| FB2-3 | 3 | — (empty) | — (empty) |  | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| FB2-4 | 4 | [OPT] Ventilateurs Cab AR BD | [OPT] Aft Cabin Fan | 2 | OPT |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| FB2-5 | 5 | [CUS] Prise USB A&C | [CUS] Helm Station USB Plug | 5 | CUS |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| FB2-6 | 6 | [OPT] Condensat Clim BD | [CUS] Waste Pump Air Cond | 7.5 | OPT |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |

### Fuse Box 03 BD Avant

| ref | pin | FR | EN | fuse | flag | zone | block | conf | notes |
|---|---|---|---|---|---|---|---|---|---|
| FB3-1 | 1 | Liseuses Cab AV | Front Cabin Reading Light | 3 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| FB3-2 | 2 | [OPT] Refroidissement Groupe electro |  | 10 | OPT |  |  | ambiguous | adjudication overlay (this sheet) — not an extraction rule; EN blank on sheet |
| FB3-3 | 3 | [OPT] Ventilateurs Cab AV BD | Front Cabin Fan | 2 | OPT |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| FB3-4 | 4 | Eclairage Soute a voiles | Sail Bay Lights | 2 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| FB3-5 | 5 | — (empty) | — (empty) |  | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| FB3-6 | 6 | — (empty) | — (empty) |  | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |

### Fuse Box 04 TD Arrière

| ref | pin | FR | EN | fuse | flag | zone | block | conf | notes |
|---|---|---|---|---|---|---|---|---|---|
| FB4-1 | 1 | — (empty) | — (empty) |  | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| FB4-2 | 2 | Liseuses Cab AR | Aft cabin Reading Light | 3 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| FB4-3 | 3 | — (empty) | — (empty) |  | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| FB4-4 | 4 | [OPT] Ventilateurs Cab AR TD | [OPT] Aft Cabin Fan | 2 | OPT |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| FB4-5 | 5 | — (empty) | — (empty) |  | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| FB4-6 | 6 | [OPT] Condensat Clim TD | [CUS] Waste Pump Air Cond | 7.5 | OPT |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |

### Fuse Box 05 TD Avant

| ref | pin | FR | EN | fuse | flag | zone | block | conf | notes |
|---|---|---|---|---|---|---|---|---|---|
| FB5-1 | 1 | Liseuses Cab AV TD | Companion Way Reading Light | 3 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| FB5-2 | 2 | [OPT] Ventilateur Cab AV TD | [OPT] FWD Cabin Fan | 2 | OPT |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| FB5-3 | 3 | — (empty) | — (empty) |  | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| FB5-4 | 4 | Eclairage Soute a voiles | Sail Bay Light | 2 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| FB5-5 | 5 | — (empty) | — (empty) |  | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| FB5-6 | 6 | — (empty) | — (empty) |  | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |

### DC500 n°0

| ref | pin | FR | EN | fuse | flag | zone | block | conf | notes |
|---|---|---|---|---|---|---|---|---|---|
| DCD0-E |  | SHUNT/ BATTERIES LITHIUM | LITHIUM BATTERIES |  | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD0-S |  | COUPE CIRCUIT | CIRCUIT BREAKER |  | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD0-01 | 1 | [OPT] COMBI 1 | [OPT] COMBIMASTER n°1 | 200 | OPT |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD0-02 | 2 | [OPT] COMBI 2 | [OPT] COMBIMASTER n°2 | 200 | OPT |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD0-03 | 3 | POMPES DE CALES AUTO | BILGE PUMPS | 35 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD0-04 | 4 | [OPT] PANNEAUX SOLAIRES | [OPT] SOLAR PANELS | 63 | OPT |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |

### DC500 n°1

| ref | pin | FR | EN | fuse | flag | zone | block | conf | notes |
|---|---|---|---|---|---|---|---|---|---|
| DCD1-E |  | COUPE CIRCUIT | CIRCUIT BREAKER |  | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD1-S |  | GUINDEAU | WINDLASS | 100 | STD |  |  | ambiguous | adjudication overlay (this sheet) — not an extraction rule; sheet REPERE is DCD1-S (not DCD1-05) — confirm |
| DCD1-01 | 1 | COI N°1 CARRE + FUSE BOX | COI N°1 CARRE + FUSE BOX | 100 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD1-02 | 2 | DC-DC 24/12V -> OI N°1 - 12V | DC-DC 24/12V -> OI N°1 - 12V | 50 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD1-03 | 3 | — (empty) | — (empty) |  | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule; blank Fonction on sheet |
| DCD1-04 | 4 | [OPT] Hifi | Hifi | 30 | OPT |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |

### DC500 n°2

| ref | pin | FR | EN | fuse | flag | zone | block | conf | notes |
|---|---|---|---|---|---|---|---|---|---|
| DCD2-E |  | FUDCD02 | FUDCD02 | 250 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD2-S |  | COFFRET MOTEUR BD | ENGINE BOX PORT |  | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD2-01 | 1 | COI N°2 BD + FUSE BOX | COI N°2 PORT + FUSE BOX | 100 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD2-02 | 2 | OI N°2 BD | OI N°2 PORT | 50 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD2-03 | 3 | [OPT] WINCH ELEC BD x2 + Line Driver | [OPT] ELEC WINCH PORT + Line Driver | 200 | OPT |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD2-04 | 4 | [OPT] DESSALINISATEUR | [OPT] WATER MAKER | 35 | OPT |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |

### DC500 n°3

| ref | pin | FR | EN | fuse | flag | zone | block | conf | notes |
|---|---|---|---|---|---|---|---|---|---|
| DCD3-E |  | FUDCD03 | FUDCD03 | 250 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD3-S |  | COFFRET MOTEUR TD | ENGINE BOX STBD |  | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD3-01 | 1 | COI N°3 TD + FUSE BOX | COI N°3 STBD + FUSE BOX | 100 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD3-02 | 2 | OI N°3 TD | OI N°3 STBD | 50 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD3-03 | 3 | [OPT] WINCH ELEC TD x2 | [OPT] ELEC WINCH STBD | 200 | OPT |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD3-04 | 4 | — (empty) | — (empty) |  | STD |  |  | ambiguous | adjudication overlay (this sheet) — not an extraction rule; confirm whether DCD3-04 blank or OPT 35A row |

### Portes-Fusible

| ref | pin | FR | EN | fuse | flag | zone | block | conf | notes |
|---|---|---|---|---|---|---|---|---|---|
| DCD2-E |  | DCD2-E | FUDCD2 | 250 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |
| DCD3-E |  | DCD3-E | FUDCD3 | 250 | STD |  |  | clear | adjudication overlay (this sheet) — not an extraction rule |

## Extractor flags

- Adjudication overlay round 7 (vessel-specific, NOT extraction rules):
-   FB2: FB2-1 and FB2-3 empty; content re-packed.
-   FB3: FB3-5 and FB3-6 empty slots added.
-   FB5-4: Sail Bay Light restored.
-   Fuse Box 01 Carré and Fuse Box 04 TD Arrière added (were missing).
-   Fuse Box 05 TD Avant location + full 6-row table restored.
-   DC500 n°0: DCD0-02 COMBI 2 restored; rows unshifted.
-   DC500 n°1: DCD1-03 empty; GUINDEAU on DCD1-S (sheet repere; not DCD1-05).
-   Sort: alpha REPERE suffixes (E/S) before numeric (-01…).
- Extraction rules remain generic only: never skip blank Fonction rows.
- STOP — pending approval to commit facts (B3).

## Cells the extractor was unsure about

- **COI n°3** `COI3-A8`: conf=ambiguous flag=STD — adjudication overlay (this sheet) — not an extraction rule; A8 black-water — confirm (A6 blank shifted A7/A8)
- **COI n°2** `COI2-O16`: conf=ambiguous flag=STD — adjudication overlay (this sheet) — not an extraction rule; blank Fonction; fuse 3 printed on sheet — confirm
- **OUTPUT INTERFACE OI n°2** `OI2-1`: conf=ambiguous flag=OPT — missing FR or EN
- **OUTPUT INTERFACE OI n°2** `OI2-2`: conf=ambiguous flag=STD — missing FR or EN
- **OUTPUT INTERFACE OI n°2** `OI2-3`: conf=ambiguous flag=STD — missing FR or EN
- **OUTPUT INTERFACE OI n°2** `OI2-4`: conf=ambiguous flag=STD — missing FR or EN
- **OUTPUT INTERFACE OI n°2** `OI2-5`: conf=ambiguous flag=STD — missing FR or EN
- **OUTPUT INTERFACE OI n°2** `OI2-6`: conf=ambiguous flag=STD — missing FR or EN
- **OUTPUT INTERFACE OI n°3** `OI3-1`: conf=ambiguous flag=OPT — missing FR or EN
- **OUTPUT INTERFACE OI n°3** `OI3-2`: conf=ambiguous flag=STD — missing FR or EN
- **OUTPUT INTERFACE OI n°3** `OI3-3`: conf=ambiguous flag=STD — missing FR or EN
- **OUTPUT INTERFACE OI n°3** `OI3-4`: conf=ambiguous flag=STD — missing FR or EN
- **OUTPUT INTERFACE OI n°3** `OI3-5`: conf=ambiguous flag=STD — missing FR or EN
- **OUTPUT INTERFACE OI n°3** `OI3-6`: conf=ambiguous flag=STD — missing FR or EN
- **Fuse Box 03 BD Avant** `FB3-2`: conf=ambiguous flag=OPT — adjudication overlay (this sheet) — not an extraction rule; EN blank on sheet
- **DC500 n°1** `DCD1-S`: conf=ambiguous flag=STD — adjudication overlay (this sheet) — not an extraction rule; sheet REPERE is DCD1-S (not DCD1-05) — confirm
- **DC500 n°3** `DCD3-04`: conf=ambiguous flag=STD — adjudication overlay (this sheet) — not an extraction rule; confirm whether DCD3-04 blank or OPT 35A row

## Planned commit (DO NOT EXECUTE until you approve B3)

After adjudication of the table above:

1. Commit adjudicated `channel_entries` + `device_locations` as `channel_map`
   facts with citations (source doc p46, 05/05/2026 Ind C).
2. Split `config_unsourced` (circuits sourced; modes/favourites/alarms unsourced).
3. Locate COI `_1`/`_2`/`_3` (salon / port / stbd).
4. Wire Controls config-layer; OPT/CUS fitted only if inventory-corroborated.
5. Re-run vessel; surface contradictions — do not auto-resolve.
6. Re-render Controls draft + provenance + reconciliation notes.

Eval: **(xxiii)**–**(xxv)** per v4.12.
