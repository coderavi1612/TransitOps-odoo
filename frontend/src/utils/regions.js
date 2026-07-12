export function regionOptionLabel(region) {
  const code = region.code ? ` (${region.code})` : '';
  const type = region.region_type ? ` - ${region.region_type}` : '';
  return `${region.name}${code}${type}`;
}

export function regionsByType(regions, type) {
  return regions.filter((region) => region.region_type === type);
}
