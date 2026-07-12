export const tooltip = (parent) => { // Reusable tooltip function

  const container = parent
    .append("g")
      .attr("class", "tooltip-container")
      .style("pointer-events", "none")
      .style("display", "none");

  const bg =container
    .append("rect")
      .attr("class", "tooltip-rect")
      .style("filter", "drop-shadow(2px 2px 2px #000000)");

  const textG = container.append("g")
    .attr("class", "tooltip-text-group");


  const titleText = textG
    .append("text")
      .attr("class", "tooltip-title")
      .attr("font-weight", "bold")
      .attr("font-size", "1.125em")
      .attr("y", 16)
      .style("pointer-events", "none");

  const valueText = textG
    .append("text")
      .attr("class", "tooltip-value")
      .attr("y", 36);
  

  const padding = 4;
  function show ({title, value,  x, y}){
    container.style("display", null);

    titleText.text(title);
    
    valueText.selectAll("*").remove();

    valueText
      .append("tspan")
      .text(value);

    const bbox = textG.node().getBBox();

    bg
      .attr("width", bbox.width + padding * 2)
      .attr("height", bbox.height + padding * 2)
      .attr("x", -padding)
      .attr("y", -padding);

    container
      .attr("transform", `translate(${x+(padding*4)}, ${y+(padding*4)})`);
  }
  function move ({x, y}){
    container.attr("transform", `translate(${x+(padding*4)}, ${y+(padding*4)})`);
  }
  function hide (){
    container.style("display", "none")
  }
  return { show, move, hide }; 
}

