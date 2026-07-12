import { tooltip } from "./tooltip.js";
import { largestPolygonCentroid } from "./largestPolygonCentroid.js";
import { colourbar } from "./colourbar.js"


// Define projection and pathGenerator
const projection = d3.geoNaturalEarth1();
const pathGenerator = d3.geoPath().projection(projection);

// Helper function for displaying the legend
const displayLegend = (parent, colourScale, year, dist, width, height) => {
  const legendG = parent.selectAll(".legendG")
    .data([null])
    .join("g")
      .attr("class", "legendG")
      .attr("transform", `translate(${52},${height - 64})`);

  colourbar(legendG, {
    colourScale,
    nTicks: 2,
    barWidth: 160,
    barHeight: 16,
    title: `% change in ${dist} years before ${year} (log scale)`
  });
};

export const worldMap = (parent, props) => {
  const {
    countries,
    emissionsByCode,
    years,
    selectedYear,
    distIntoPast,
    idToAlpha3,
    countryClick,
    forceEnabled=false
  } = props;

  const rect = parent.node().getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const padding = 8;

  if (countries) {
    projection.fitExtent([[padding, padding], [width - padding, height - padding]], countries);
  }

  // Group for map elements
  let g = parent.selectAll(".map-contents").data([null]);
  const gEnter = g.enter().append("g").attr("class", "map-contents");
  g = gEnter.merge(g);


  // Zoom interactivity (using d3-zoom package)
  parent.call(d3.zoom()
    .scaleExtent([1, 8])
    .translateExtent([[0, 0], [width, height]])

    .on("zoom", event => {
      g.attr("transform", event.transform);
      // Hide legend heading when zoomed in 
      parent.selectAll(".legend").style("opacity", event.transform.k > 1.1 ? 0 : 1);
    }));

  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  const getPercentChange = (countryCode, currentYear = selectedYear) => {
    const yearInPast = Math.max(minYear, Number(currentYear) - distIntoPast);
    const countryYears = emissionsByCode.get(countryCode)?.values;
    if (countryYears) {
      // Percentage increase
      return (countryYears[currentYear] - countryYears[yearInPast]) / countryYears[yearInPast];
    }
  };

  // Set boundaries of scale on most extreme PercentChange distIntoPast years in the past from ANY given year
  // This allows the user to change the current year on the timeline and observe relative differences
  // First collecting all finite percent changes across all years
  const allPercentChanges = [];
  emissionsByCode.forEach((data, code) => {
    for (let year = minYear; year <= maxYear; year++) {
      const change = getPercentChange(code, year);
      if (change !== undefined && isFinite(change)) {
        allPercentChanges.push(Math.abs(change));
      }
    }
  });

  // Then using 99th percentile instead of max to avoid outliers skewing the scale 
  // e.g. weird data in Equatorial Guinea, this is just a feature of the dataset
  allPercentChanges.sort(d3.ascending);
  const maxAbsPercentChange = d3.quantile(allPercentChanges, 0.99);

  // Colour scale in order to encode PercentChange through colour channel
  // Use symmetric log scale since the data includes large differences in scale
  const colourScale = d3.scaleSequentialSymlog(d3.interpolateBrBG)
    .domain([maxAbsPercentChange, -maxAbsPercentChange])
    .constant(0.01)
    .clamp(true); // clamping necessary since we base it on 99th percentile not max - there will be outliers

  displayLegend(parent, colourScale, selectedYear, distIntoPast, width, height);

  // Radius scale uses sqrt for accurate encoding
  // Domain is based on width since we want circle size to be smaller on small screens
  const rScale = d3.scaleSqrt()
    .domain([0, d3.max([...emissionsByCode.values()], d => d3.max(Object.values(d.values)))])
    .range([0.5, width / 10]);

  // Earth's border
  const sphere = g.selectAll(".sphere").data([null]);
  sphere.enter().append("path")
    .attr("class", "sphere")
    .merge(sphere)
    .attr("d", pathGenerator({ type: "Sphere" }));

  // Tooltip event listeners
  if (!parent.node().__tip) {
    parent.node().__tip = tooltip(parent);
  }
  const tip = parent.node().__tip;

  // Paths for countries
  const countryPaths = g.selectAll(".country").data(countries ? countries.features : [], d => d.id);
  countryPaths.join("path")
    .attr("class", "country")
    .attr("d", pathGenerator)
    .attr("fill", "#ccc")
    .attr("opacity", forceEnabled ? 0.25 : 1)
    .attr("vector-effect", "non-scaling-stroke");

  const t = d3.transition().duration(750).ease(d3.easeCubicInOut);

  // Filter out Ashmore and Cartier Is. since it has the same id in the countries-50m.json as Australia
  // If we don't do this it leads to an uninhabited territory being displayed as having the same emissions as all of Australia
  const circleData = countries ? countries.features.filter(d => d.properties.name !== "Ashmore and Cartier Is.") : [];

  // Persistent node map
  // Set initial positions from geographic centroids on first render only apply simulation.
  // Since it is stored on the DOM, we don't have to redo it every render
  if (!parent.node().__nodes) {
    parent.node().__nodes = new Map();
  }
  const nodeMap = parent.node().__nodes;

  // Update nodes target and radius
  circleData.forEach(d => {
    const code = idToAlpha3.get(Number(d.id));
    const value = emissionsByCode.get(code)?.values[selectedYear];
    const [gx, gy] = projection(largestPolygonCentroid(d));
    if (!nodeMap.has(d.id)) {
      // Initial position should be the centroid (largestPolygon)
      nodeMap.set(d.id, { id: d.id, x: gx, y: gy, gx, gy, r: 0 });
    } else {
      const node = nodeMap.get(d.id);
      node.gx = gx;
      node.gy = gy;
    }
    nodeMap.get(d.id).r = value ? rScale(value) : 0;
  });

  const simNodes = circleData.map(d => nodeMap.get(d.id));




  // Emissions circles
  const circles = g.selectAll(".emissions-circle").data(circleData, d => d.id);

  const allCircles = circles.join(
    enter => enter.append("circle")
      .attr("class", "emissions-circle")
      .attr("vector-effect", "non-scaling-stroke")
      .attr("cx", d => nodeMap.get(d.id).x)
      .attr("cy", d => nodeMap.get(d.id).y)
      .attr("r", 0)
      .attr("fill-opacity", 0.9),
    update => update,
    exit => exit.transition(t).attr("r", 0).remove()
  );

  // Event listeners
  allCircles
    .on("mouseenter", (e, d) => {
      const value = emissionsByCode.get(idToAlpha3.get(Number(d.id)))?.values[selectedYear];
      const percentChange = getPercentChange(idToAlpha3.get(Number(d.id)));
      const formattedPercentChange = (percentChange > 0 ? "+" : "") +Math.round(percentChange*100) + "%"
      if (value !== undefined) {
        tip.show({
          title: d.properties.name,
          value: value.toLocaleString("en", { maximumSignificantDigits: 4 }) + " Mt CO2eq/yr, " + formattedPercentChange,
          x: e.offsetX < width-228 ? e.offsetX : e.offsetX-240,
          y: e.offsetY
        });
      }
    })
    // Adjust for if the tooltip would be too close to an edge of the map
    .on("mousemove", (e) => tip.move({ x: e.offsetX < width-228 ? e.offsetX : e.offsetX-240, y: e.offsetY }))
    .on("mouseleave", () => tip.hide())
    .on("click", (e, d) => countryClick(idToAlpha3.get(Number(d.id)), d.properties.name));

  // Transitions
  allCircles.transition(t)
    .attr("r", d => nodeMap.get(d.id).r)
    .attr("fill", d => colourScale(getPercentChange(idToAlpha3.get(Number(d.id)))));


  // Force simulation
  // Reuse the existing simulation if present, if not we have to create it
  if (!parent.node().__sim) {
    parent.node().__sim = d3.forceSimulation()
      .force("collide", d3.forceCollide(d => d.r + 1).strength(0.75).iterations(3))
      .force("x", d3.forceX(d => d.gx).strength(0.1))
      .force("y", d3.forceY(d => d.gy).strength(0.1));
  }
  const sim = parent.node().__sim;

  if (forceEnabled) {
    sim
      .nodes(simNodes)
      // Refresh forces
      .force("collide", d3.forceCollide(d => d.r + 1).strength(0.75).iterations(3))
      .force("x", d3.forceX(d => d.gx).strength(0.1))
      .force("y", d3.forceY(d => d.gy).strength(0.1))
      .on("tick", () => {
        g.selectAll(".emissions-circle")
          .attr("cx", d => nodeMap.get(d.id)?.x ?? 0)
          .attr("cy", d => nodeMap.get(d.id)?.y ?? 0);
      })
      .alpha(0.3) // If force has already been enabled we can start the alpha pretty low
      .restart();
  } else {
    // Stop simulation and animate circles back to geographic centroids
    sim.stop();
    allCircles.transition(t)
      .attr("cx", d => nodeMap.get(d.id).gx)
      .attr("cy", d => nodeMap.get(d.id).gy);
    // Reset node positions
    simNodes.forEach(n => { n.x = n.gx; n.y = n.gy; n.vx = 0; n.vy = 0; });
  }
};