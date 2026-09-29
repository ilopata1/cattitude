/** Rows on the More tab. Sailing boats match the zone-map rigging set. */

export const SAILING_VESSEL_TYPES = [
  'cruising_monohull',
  'sailing_catamaran',
  'sailing_trimaran',
] as const;

export interface MoreRow {
  id: 'ask' | 'sail' | 'polar' | 'anchorage' | 'settings';
  label: string;
  subtitle: string;
  icon: string;
  /** Path segments under /tabs/more. */
  route: string[];
}

const SAILING = new Set<string>(SAILING_VESSEL_TYPES);

export function isSailingVessel(vesselType: string | null | undefined): boolean {
  return SAILING.has(vesselType || '');
}

export function moreMenu(vesselType: string | null | undefined): MoreRow[] {
  const sailing = isSailingVessel(vesselType);
  const rows: MoreRow[] = [
    {
      id: 'ask',
      label: 'Ask the manuals',
      subtitle: 'Questions answered from this boat’s documents',
      icon: 'chatbubble-ellipses-outline',
      route: ['ask'],
    },
    {
      id: 'sail',
      label: sailing ? 'Sail' : 'Instruments',
      subtitle: 'Depth, speed, and wind',
      icon: sailing ? 'compass-outline' : 'speedometer-outline',
      route: ['sail'],
    },
  ];
  if (sailing) {
    rows.push({
      id: 'polar',
      label: 'Polar',
      subtitle: 'How she is sailing against her sail plan',
      icon: 'speedometer-outline',
      route: ['polar'],
    });
  }
  rows.push(
    {
      id: 'anchorage',
      label: 'Anchorage',
      subtitle: 'Anchor watch and nearby boats',
      icon: 'anchor-outline',
      route: ['anchorage'],
    },
    {
      id: 'settings',
      label: 'Settings',
      subtitle: sailing ? 'Signal K, instruments, and the sail plan' : 'Signal K and instruments',
      icon: 'settings-outline',
      route: ['settings'],
    },
  );
  return rows;
}
