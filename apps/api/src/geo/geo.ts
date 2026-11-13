/** PostGIS helpers — WKT for geography(Point,4326). lng first. */
export function pointWkt(lng: number, lat: number): string {
  return `POINT(${lng} ${lat})`;
}
