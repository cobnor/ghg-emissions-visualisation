// Fixes the issue where countries with overseas territories can skew the built-in d3.geoCentroid.
// For example, France's geoCentroid is on top of Spain normally.
// This is fixed by finding the largest polygon, and then only callind d3.geoCentroid on that.
export const largestPolygonCentroid = (feature) => {

  // If only one polygon in feature geometry this must trivially be the largest
  if (feature.geometry.type === "Polygon") {
    return d3.geoCentroid(feature);
  }

  // If multiple polygons, break down into single polygons, sort by area and pick out the largest 
  if (feature.geometry.type === "MultiPolygon") {
    let largest = feature.geometry.coordinates
      .map(p => ({
        poly: { type: "Polygon", coordinates: p },
        area: d3.geoArea({ type: "Polygon", coordinates: p })
      }))
      .sort((a, b) => b.area - a.area)[0].poly;

    return d3.geoCentroid(largest);
  }

  // Edge case
  return d3.geoCentroid(feature);
}