import { tooltip } from "./tooltip.js"
export const stackedAreaChart = (parent, props) => {
  const {
    data, 
    name,
    margin,
    displayType,
    selectedSubstances = new Set(),
    selectedYear,
    pastYear,
    colourMap
  } = props;

  const rect = parent.node().getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  // When no data is loaded
  if (!data) {
    parent.selectAll(".empty-message").remove();// Don't allow multiple messages to be drawn on top of each other
    // Draw message
    parent.append("text")
      .attr("class", "empty-message")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#666")
      .attr("font-style", "italic")
      .attr("pointer-events", "none")
      .text("Click on a country for detailed view.");
    return;
  }
  parent.selectAll(".empty-message").remove(); // Clean up message if data is present

  // Only append the chart group if it doesn't already exist
  let chart = parent.selectAll(".chart").data([null]);
  chart = chart.enter()
    .append("g")
    .attr("class", "chart")
    .merge(chart)
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Data processing
  const years = Object.keys(data).sort();
  //const availableSubstances = Object.keys(data[years[0]] || {});
  //const substancesToProcess = selectedSubstances.size > 0 ? Array.from(selectedSubstances) : availableSubstances;
  const substancesToProcess = Array.from(selectedSubstances);
  const sectors = [...new Set(substancesToProcess.flatMap(sub => Object.keys(data[years[0]]?.[sub] || {})))];

  const formattedData = years.map(year => {
    const entry = { year: +year };
    sectors.forEach(sector => entry[sector] = 0);
    substancesToProcess.forEach(sub => {
      const substanceData = data[year][sub] || {};
      sectors.forEach(sector => entry[sector] += (substanceData[sector] || 0));
    });
    entry.total = d3.sum(sectors, s => entry[s]);
    return entry;
  });

  const plotData = displayType === "relative" 
    ? formattedData.map(d => {
        const row = { year: d.year };
        sectors.forEach(s => row[s] = d.total === 0 ? 0 : (d[s] / d.total) * 100);
        row.total = d.total;
        return row;
      })
    : formattedData;

  // Set up scales and transitions
  const t = d3.transition().duration(750).ease(d3.easeCubicInOut);

  const xScale = d3.scaleLinear()
    .domain(d3.extent(plotData, d => d.year))
    .range([0, innerWidth])
    .nice();

  const yScale = d3.scaleLinear().range([innerHeight, 0]);
  if (displayType === "relative") {
    yScale.domain([0, 100]);
  } else {
    const maxY = d3.max(plotData, d => d3.sum(sectors, s => d[s]));
    yScale.domain([0, maxY]).nice();
  }


  //const colourScale = d3.scaleOrdinal().domain(sectors).range(d3.schemeTableau10);
  const colourScale = d3.scaleOrdinal()
    .domain(Object.keys(colourMap))
    .range(Object.values(colourMap));


  const stack = d3.stack().keys(sectors);
  const stackedData = stack(plotData);

  const area = d3.area()
    .x(d => xScale(d.data.year))
    .y0(d => yScale(d[0]))
    .y1(d => yScale(d[1]));

  // Axes
  const xAxisG = chart.selectAll(".x-axis").data([null]).join("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${innerHeight})`);
  
  xAxisG.transition(t).call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

  const yAxisG = chart.selectAll(".y-axis").data([null]).join("g")
    .attr("class", "axis y-axis");

  yAxisG.transition(t).call(d3.axisLeft(yScale)
    .tickSize(-innerWidth)
    .tickPadding(10)
    .tickFormat(d => displayType === "relative" ? `${d}%` : d)
  );

  // Change the axis title based on the substances selected for filtering
  let substanceLabel = selectedSubstances.size === 4 ? "Total GHG" : Array.from(selectedSubstances).join(" + ");

  let axisTitle = chart.selectAll(".axis-title").data([null]);
  axisTitle.join("text")
    .attr("class", "axis-title")
    .attr("x", -40)
    .attr("y", -24)
    .attr("fill", "#666")
    .attr("font-weight", "600")
    .attr("font-size", "0.75rem")
    .attr("font-family", "Mona Sans")
    .attr("text-anchor", "start")
    .attr("dominant-baseline", "hanging")
    .text(displayType === "relative" ? "Relative Contribution (%)" : `Mt ${substanceLabel}/yr`);

  // Using d.key as key so sectors morph correctly
  const paths = chart.selectAll(".area").data(stackedData, d => d.key);

  paths.join(
    enter => {
      const pathEnter = enter.append("path")
        .attr("class", "area")
        .attr("fill", d => colourScale(d.key))
        .attr("fill-opacity", 0)
      // Make title element
      pathEnter.append("title");

      return pathEnter;
    },
    update => update,
    exit => exit.transition(t).attr("fill-opacity", 0).remove()
  )
  .transition(t)
    .attr("d", area)
    .attr("fill", d => colourScale(d.key))
    .attr("fill-opacity", 0.75)
    .select("title").text(d => d.key);
    

  // Indicators for both selected year and previous year
  const yearLine = chart.selectAll(".current-year-line").data([selectedYear]);
  yearLine.join("line")
    .attr("class", "current-year-line")
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .transition(t)
    .attr("x1", d => xScale(d))
    .attr("x2", d => xScale(d));

  const yearText = chart.selectAll(".current-year-line-text").data([selectedYear]);
  yearText.join("text")
    .attr("class", "current-year-line-text")
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("font-family", "JetBrains Mono")
    .attr("pointer-events", "none")
    .attr("fill", "#b2b2b2")
    .transition(t)
    .attr("x", d => xScale(d))
    .text(d => d);


  
  const pastYearLine = chart.selectAll(".past-year-line").data([pastYear]);
  pastYearLine.join("line")
    .attr("class", "past-year-line")
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .transition(t)
    .attr("x1", d => xScale(d))
    .attr("x2", d => xScale(d));

  const pastYearText = chart.selectAll(".past-year-line-text").data([pastYear]);
  pastYearText.join("text")
    .attr("class", "past-year-line-text")
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("font-family", "JetBrains Mono")
    .attr("pointer-events", "none")
    .attr("fill", "#7c7c7c")
    .transition(t)
    .attr("x", d => xScale(d))
    .text(d => d);


  // Tooltip

  if (!parent.node().__tip) {
    parent.node().__tip = tooltip(parent);
  }
  const tip = parent.node().__tip;

  const bisectYear = d3.bisector(d => d.year).center;

  chart.selectAll(".hover-dot").data([null]).join("circle")
    .attr("class", "hover-dot")
    .attr("r", 4)
    .attr("fill", "#ffffff")
    .attr("opacity", 0.9)
    .attr("pointer-events", "none")
    .attr("display", "none");
    
  // Have to draw an overlay rect over the graph to detect mouse inputs
  chart.selectAll(".mouse-overlay").data([null]).join("rect")
    .attr("class", "mouse-overlay")
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .on("mousemove", function (e) {
      const [mx, my] = d3.pointer(e, chart.node());
      const index = bisectYear(plotData, xScale.invert(mx));
      const d = plotData[index];
      if (!d) return;

      const totalLabel = displayType === "relative" ? 
        `${d.total.toLocaleString("en", { maximumSignificantDigits: 5 })} Mt/yr` : `${d.total.toLocaleString("en", { maximumSignificantDigits: 5 })} Mt ${substanceLabel}/yr`;

      // Determine which stacked sector (if any) the cursor is hovering over by
      // inverting the y position back into data space and checking layer bounds
      const yValue = yScale.invert(my);
      let hoveredSector = null;
      for (const layer of stackedData) {
        const layerPoint = layer[index];
        if (layerPoint && yValue >= layerPoint[0] && yValue <= layerPoint[1]) {
          hoveredSector = layer.key;
          break;
        }
      }

      // Show sector name + amount when over an area
      // If hovered over nothing (in the else part) then just display total
      const titleLabel = String(d.year) + (hoveredSector ? `, ${hoveredSector}` : "");
      let valueLabel;
      if (hoveredSector) {
        const sectorAmount = d[hoveredSector];
        valueLabel = displayType === "relative"
          ? `${sectorAmount.toLocaleString("en", { maximumSignificantDigits: 5 })}%`
          : `${sectorAmount.toLocaleString("en", { maximumSignificantDigits: 5 })} Mt ${substanceLabel}/yr`;
      } else {
        valueLabel = totalLabel;
      }
      

      // Move the dot to the top of the hovered layer
      const layerTop = hoveredSector
        ? stackedData.find(layer => layer.key === hoveredSector)[index][1]
        : (displayType === "relative" ? 100 : d.total);
      chart.select(".hover-dot")
        .attr("display", null)
        .attr("cx", xScale(d.year))
        .attr("cy", yScale(layerTop));

      tip.show({ title: titleLabel, value: valueLabel, x: xScale(d.year)+42, y: yScale(layerTop)-42 });
      
    })
    .on("mouseleave", () => {
      tip.hide();
      chart.select(".hover-dot").attr("display", "none");
    });


};