export const timeline = (parent, props) => {
  const {
    selectedStartYear,
    selectedEndYear,
    onYearUpdate
  } = props;

  const minYear = 1970;
  const maxYear = 2024;
  // Handle sizes
  const rRight = 8;
  const rLeft = 5;
  const trackHeight = 8;

  const rect = parent.node().getBoundingClientRect();
  const width = rect.width;
  const height = 100;
  const margin = { top: 20, right: 30, bottom: 50, left: 30 };
  const innerWidth = width - margin.left - margin.right;

  const xScale = d3.scaleLinear()
    .domain([minYear, maxYear])
    .range([0, innerWidth])
    .clamp(true);

  let svg = parent.selectAll(".slider-svg").data([null]);
  svg = svg.enter()
    .append("svg")
      .attr("class", "slider-svg")
    .merge(svg)
      .attr("width", width)
      .attr("height", height)
      .attr("overflow", "visible");

  let g = svg.selectAll(".slider-group").data([null]);

  g = g.enter()
  .append("g")
    .attr("class", "slider-group")
  .merge(g)
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Axis
  const axis = d3.axisBottom(xScale).ticks(maxYear - minYear).tickFormat(d3.format("d"));
  let gAxis = g.selectAll(".axis").data([null]);
  gAxis = gAxis.enter()
    .append("g")
      .attr("class", "axis")
    .merge(gAxis)
      .attr("transform", `translate(0, 20)`)
      .call(axis);

  gAxis.selectAll("text")
    .attr("class", "timeline-axis-text")
    .attr("font-size", d => d === selectedEndYear ? "12px" :"10px")
    .attr("transform", "rotate(-45)")
    .attr("font-weight", d => d === selectedEndYear ? "800" :"400")
    .attr("text-anchor", "end")
    .attr("dx", "-0.8em")
    .attr("dy", "0.15em");

  // Track
  let track = g.selectAll(".track").data([null]);
  track = track.enter()
  .append("line")
    .attr("class", "track")
  .merge(track)
    .attr("x1", xScale.range()[0])
    .attr("x2", xScale.range()[1])

  // Layered here so handles appear on top
  let rangeBar = g.selectAll(".range-bar").data([null]);
  rangeBar = rangeBar.enter().append("rect")
    .attr("class", "range-bar")
    .attr("fill", "#344c5d")
    .attr("height", 8)
    .merge(rangeBar)
    .attr("y", -trackHeight/2) // Center vertically on track line
    .attr("x", xScale(selectedStartYear))
    .attr("width", xScale(selectedEndYear) - xScale(selectedStartYear));

  let currentL = selectedStartYear;
  let currentR = selectedEndYear;
  let gap = currentR - currentL;

  // Using d3.drag to let the user move the handles
  const drag = d3.drag()
    .on("drag", function(event, d) {
      const [mx] = d3.pointer(event, g.node());
      const mouseYear = Math.round(xScale.invert(mx));

      if (d.type === "left") {
        currentL = Math.min(mouseYear, currentR - 1);
        gap = currentR - currentL; 
      } else {
        let targetR = mouseYear;
        let targetL = targetR - gap;

        // Boundary clamping
        if (targetL < minYear) {
          targetL = minYear;
          targetR = minYear + gap;
        }
        if (targetR > maxYear) {
          targetR = maxYear;
          targetL = maxYear - gap;
        }

        currentL = targetL;
        currentR = targetR;
      }

      g.selectAll(".handle-left").attr("x", xScale(currentL) - rLeft / 2);
      g.selectAll(".handle-right").attr("cx", xScale(currentR));

      rangeBar
        .attr("x", xScale(currentL))
        .attr("width", xScale(currentR) - xScale(currentL));
    })
    .on("end", function() {
      d3.select(this).attr("stroke-width", 2);
      
      // Update only on release 
      if (onYearUpdate) {
        onYearUpdate(currentL, currentR);
      }
    });

  const handleData = [
    { type: "left", year: currentL },
    { type: "right", year: currentR }
  ];

  // Left handle is a vertical bar, right handle is a circle
  g.selectAll(".handle-left").data([handleData[0]], d => d.type)
    .join("rect")
    .attr("class", "handle handle-left")
    .attr("width", rLeft)
    .attr("height", rRight * 2)
    .attr("rx", 2)
    .attr("x", d => xScale(d.year) - rLeft / 2)
    .attr("y", -rRight)
    .attr("fill", "#e1e1e1")
    .call(drag);

  g.selectAll(".handle-right").data([handleData[1]], d => d.type)
    .join("circle")
    .attr("class", "handle handle-right")
    .attr("r", rRight)
    .attr("cy", 0)
    .merge(g.selectAll(".handle-right"))
    .attr("cx", d => xScale(d.year))
    .call(drag);
};