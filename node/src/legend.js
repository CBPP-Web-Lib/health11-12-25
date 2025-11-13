import { select as d3_select } from "d3";
import commaNumber from "comma-number";
/**
 * Create legend
 */
function create_legend(el, bins, colors) {
  var legend = document.createElement("div");
  legend.classList.add("legend");
  document.querySelector(el).prepend(legend)
  bins.forEach((bin, i) => {
    if (i === bins.length - 1) {return;}
    legend.appendChild(create_bin(bin, colors[i]))
  })
  legend.appendChild(create_final_label(bins[bins.length - 1]))
  /*Each box should use percentage width but % depends on the number of bins, so
  set a CSS variable*/
  document.querySelector(el).style.setProperty("--bin-width", 100/(bins.length-1) + "%")
  return { legend }
}

function dollar(n) {
  return "<span class='roomy'>$" + commaNumber(Math.round(n)) + `</span>
    <span class='compressed'>$` + Math.round(n/100)/10 + "K</span>";
}

/**
 * Use SVG rects to draw legend (CSS background-color doesn't print) 
 */
function create_bin(bin, color) {
  var box = document.createElement("div");
  box.classList.add("box");
  d3_select(box).append("svg")
    .attr("viewBox", "0 0 10 10")
    .attr("preserveAspectRatio","none")
    .append("rect")
      .attr("x", -1)
      .attr("y", -1)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color)
      .attr("stroke-width", 0)
  var label = document.createElement("div");
  label.classList.add("label");
  label.innerHTML = "<div>" + dollar(bin) + "</div>";
  box.appendChild(label);
  return box;
    
}

/*Last label at the end; more labels than boxes*/
function create_final_label(n) {
  var box = document.createElement("div");
  box.classList.add("fake-box");
  var label = document.createElement("div");
  label.classList.add("label");
  label.innerHTML = "<div>" + dollar(n) + "</div>";
  box.appendChild(label);
  return box;
}

export { create_legend }