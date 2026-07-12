export const colourbar = (parent, props) => {
  const { 
    colourScale,
    nTicks,
    barWidth,
    barHeight,
    title
  } = props;
  // Accomodate for diverging scales
  const extent = colourScale.domain();
  const mid = 0; // All diverging scales centred on 0 in our implementation
  const midOffset = (mid - extent[0]) / (extent[1] - extent[0]) * 100;


  // Create legend group to append our legend
  const legendG = parent.selectAll(".legend")
    .data([null])
    .join("g")
      .attr("class", "legend");
  

  // Legend rectangle
  const legendRect = legendG.selectAll(".legend-rect")
    .data([null])
    .join("rect")
      .attr("width",  barWidth)
      .attr("height", barHeight);

  // Legend title
  legendG.selectAll(".legend-title")
    .data([null])
    .join("text")
      .attr("class", "legend-title")
      .attr("x", barWidth/2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .text(title);

  // Legend labels
  const ticks = Array.from(Array(nTicks).keys())
    .map(d => extent[0] + (extent[1] - extent[0]) * d / (nTicks - 1)).reverse();
  legendG.selectAll(".legend-label").data(ticks)
    .join("text")
      .attr("class", "legend-label")
      .attr("text-anchor", "middle")
      .attr("y", barHeight + 15.5)
      .attr("x", (d, i) => Math.round(barWidth * i / (nTicks - 1)))
      .text(d => (Math.sign(d) === 1 ? "+" : "") +Math.round(d * 100) + "%");
  // Stops (Must include midpoint, also reverse the order since it"s more intuitive for the greatest to be on the right)
  const legendStops = [
    { color: colourScale(extent[1]), offset: 0 },
    { color: colourScale(mid),       offset: midOffset },
    { color: colourScale(extent[0]), offset: 100 },
  ];
  
  // Linear gradient to be used for the legend
  let linearGradient = parent.select("#legend-gradient");
  if (linearGradient.empty()) {
    linearGradient = parent.append("linearGradient")
      .attr("id", "legend-gradient");
  }
  // Update gradient for legend
  linearGradient.selectAll("stop").data(legendStops)
    .join("stop")
      .attr("offset", d => `${d.offset}%`)
      .attr("stop-color", d => d.color);
  // Apply gradient to rectangle
  legendRect.attr("fill", "url(#legend-gradient)");



  legendG.select(".legend-bg").remove();
  const padding = { x: 10, y: 8 };
  
  // Make sure it fits all the stuff we've already rendered 
  const bbox = legendG.node().getBBox();

  legendG.selectAll(".legend-bg")
    .data([null])
    .join("rect")
      .attr("class", "legend-bg")
      .attr("x",      bbox.x - padding.x)
      .attr("y",      bbox.y - padding.y)
      .attr("width",  bbox.width  + padding.x * 2)
      .attr("height", bbox.height + padding.y * 2)
      .attr("rx", 8)
      .attr("fill", "rgba(15, 21, 26, 0.61)")
      .attr("stroke", "#3d3d3d")
      .attr("stroke-width", 1)
      .lower(); // Move to back
};