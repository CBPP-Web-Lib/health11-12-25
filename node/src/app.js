import "./style.scss";
import { 
  select as d3_select, 
  geoAlbersUsa as d3_geoAlbersUsa,
  geoPath as d3_geoPath 
} from "d3";
import {feature} from "topojson"
import axios from "axios"
import svgPanZoom from "svg-pan-zoom";
import cbpp_colorgen from "cbpp_colorgen";
import Handlebars from "handlebars";
import commaNumber from "comma-number";
import popupSnippet from "./popup.snippet";
import { loadTypekit } from "./load_typekit";
import { create_legend } from "./legend";
import { event_handlers } from "./event_handlers";
import { merge_csv, binData, parse_csv } from "./data_utils";
import { merge_states_from_districts } from "./merge_states_from_districts";

/**
 * Initial setup tasks
 */
const id = "health11-12-25"
const sel = "#" + id
const script_id = "script_" + id
const script_sel = "#" + script_id

/*Gets the correct base URL regardless of whether we're on the test apps.cbpp.org page or the real cbpp.org page*/
const url_base = document.querySelector(script_sel).src.replace(/js\/app(\.min)*\.js/g,"").split("?")[0];

/*Colors, widths, etc.*/
const DISTRICT_BORDER_WIDTH = 0.2
const STATE_BORDER_WIDTH = 0.6
const LOW_COLOR = "#f8dad1"
const HIGH_COLOR = "#ba0f26"
const NUM_BINS = 8
const STATE_BORDER_COLOR = "#000000"
const DISTRICT_BORDER_COLOR = "#FFFFFF"
const HOVER_COLOR = "#9ab0db"
const PRIMARY_COL = "couple_increase"
const NO_DATA_COLOR = "#888"

/*This is a utility library that interpolates colors and returns a list*/
const BIN_COLORS = cbpp_colorgen(LOW_COLOR, HIGH_COLOR, NUM_BINS, null, true);

/*Add hover color to base element styles where it is actually used*/
document.querySelector(sel).style.setProperty("--district-hover-color", HOVER_COLOR)

/*Set projection and path generator*/
const projection = d3_geoAlbersUsa();
const pathGenerator = d3_geoPath(projection);

/*Setup popup handlebars template*/
Handlebars.registerHelper("dollar", function(n) {
  return "$" + commaNumber(Math.round(n));
})
Handlebars.registerHelper("commaNumber", function(n) {
  return commaNumber(Math.round(n))
})
Handlebars.registerHelper("percent", function(n) {
  return Math.round(n*100) + "%";
});
Handlebars.registerHelper("annualize", function(n) {
  return n*12
})
Handlebars.registerHelper("capCase", function(t) {
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return t;
})
Handlebars.registerHelper("label_br", function(t) {
  t = t.split(", $");
  return t.join(", <br>$");
})
const popupMakerRaw = Handlebars.compile(popupSnippet);
const popupMaker = function(data) {
  var popupData = {};
  Object.keys(data).forEach((key) => {
    popupData[key] = data[key];
  })
  if (popupData.notes === "NA") {
    delete(popupData.notes);
  }
  popupData.enhancements = "enhancements";
  if (popupData.state_fips == 35) {
    popupData.enhancements = "New Mexico Premium Assistance";
  }
  return popupMakerRaw(popupData);
}

/**
 * Download the required files, Typekit fonts, and wait for DOMContentLoaded
 */
Promise.all([
  new Promise((resolve) => {document.addEventListener("DOMContentLoaded", resolve)}),
  axios.get(url_base + "topojson/cd_topojson.json"),
  axios.get(url_base + "data.csv?r=111324_1"),
  loadTypekit()
]).then((d) => {

  /*Convert the downloaded topojson files to GeoJSON*/
  var geojson = feature(d[1].data, d[1].data.objects.districts);

  /*Merge districts together into states to draw state borders*/
  var state_geojson = merge_states_from_districts(d[1].data);

  /*Parse the data CSV*/
  var {data, headers} = parse_csv(d[2].data);
  
  /*Merge it into the GeoJSON data*/
  merge_csv(geojson, data, headers);

  /*Create the SVG and the zoom controller*/
  var {svg, zoomer} = create_svg(sel + " .map-wrap");

  /*Create the zoom buttons*/
  create_controls(sel, zoomer);

  /*Calculate the ideal bins*/
  var bins = binData(geojson.features, PRIMARY_COL, NUM_BINS, 500);

  /*Draw the map!*/
  draw_districts({svg, geojson, data, bins});

  /*Overlay states*/
  draw_states(svg, state_geojson);

  /*Draw the legend*/
  create_legend(sel + " .map-wrap", bins, BIN_COLORS);

  /*Show the whole thing*/
  document.querySelector(sel).classList.add("loaded")
  document.querySelector(sel).style.visibility = "visible";
})


/**
 * Make the buttons and attach handlers
 */
function create_controls(sel, zoomer) {
  var buttons = document.createElement("div");
  buttons.classList.add("buttons");
  var zoom_in = document.createElement("button");
  zoom_in.innerText = "Zoom In";
  buttons.append(zoom_in);
  var zoom_out = document.createElement("button");
  zoom_out.innerText = "Zoom Out";
  buttons.append(zoom_out);
  zoom_in.addEventListener("click", (e) => {zoomer.zoomIn()});
  zoom_out.addEventListener("click", (e) => {zoomer.zoomOut()});
  var reset = document.createElement("button");;
  reset.innerText = "Reset";
  buttons.append(reset);
  reset.addEventListener("click", (e) => {
    zoomer.resetZoom()
    zoomer.resetPan();
  });
  document.querySelector(sel + " .svg-wrap").appendChild(buttons);

}

/**
 * Runs whenever map is zoomed in or out - we don't want the borders
 * to be huge when zoomed in, so adjust based on zoom level
 */
function adjustStrokeWidth(z) {
  var az = Math.sqrt(z)
  d3_select(sel).selectAll("svg path.district").each(function() {
    d3_select(this).attr("stroke-width", DISTRICT_BORDER_WIDTH/az);
  });
  d3_select(sel).selectAll("svg path.state").each(function() {
    d3_select(this).attr("stroke-width", STATE_BORDER_WIDTH/az);
  });
}

/**
 * Create SVG and zoomer controller
 */
function create_svg(sel) {
  document.querySelector(sel).innerHTML = "<div class='svg-wrap'></div>";
  var svg = d3_select(sel + " .svg-wrap").append("svg")
    .attr("viewBox", "20 0 860 500");
  var popup_wrap = d3_select(sel + " .svg-wrap").append("div")
    .attr("class","popup-wrap");
  var zoomer = svgPanZoom(sel + " svg", {
    onZoom: adjustStrokeWidth,
    zoomScaleSensitivity: 0.4,
    minZoom: 1,
    maxZoom: 50
  });
  window.addEventListener("resize", () => {
    zoomer.resize()
    zoomer.center()
  });
  return {svg, zoomer, popup_wrap};
}

/**
 * Draw states (purely decorative, no functionality attached)
 */
function draw_states(svg, geojson) {
  var states = svg.select(".svg-pan-zoom_viewport").selectAll("path.state")
    .data(geojson.features);
  states
    .enter()
    .append("path")
    .attr("fill", "none")
    .attr("stroke", STATE_BORDER_COLOR)
    .attr("stroke-width", STATE_BORDER_WIDTH)
    .attr("class","state")
    .merge(states)
    .attr("d", pathGenerator)
}

/**
 * Draw the congressional districts. Use standard d3 enter/merge/exit pattern
 */
function draw_districts(args) {
  var {svg, geojson, bins} = args

  const { 
    mouseEnterHandler, 
    mouseLeaveHandler, 
    mouseMoveHandler, 
    touchEndHandler, 
    windowTouchEndHandler,
    onMouseDown,
    onMouseUp
  } = event_handlers({sel, popupMaker});

  document.body.addEventListener("touchend", windowTouchEndHandler);
  document.body.addEventListener("mousedown", onMouseDown)
  document.body.addEventListener("mouseup", onMouseUp) 

  var districts = svg.select(".svg-pan-zoom_viewport").selectAll("path.district")
    .data(geojson.features);
  
  districts
    .enter()
    .append("path")
    .attr("class","district")
    .attr("d", pathGenerator)
    .on("touchend", touchEndHandler)
    .on("mouseenter", mouseEnterHandler)
    .on("mousemove", mouseMoveHandler)
    .on("mouseleave", mouseLeaveHandler)
    .merge(districts)
    .attr("stroke", DISTRICT_BORDER_COLOR)
    .attr("stroke-width", DISTRICT_BORDER_WIDTH)
    .attr("fill", (d) => {
      if (d.properties[PRIMARY_COL]) {
        var this_color;
        BIN_COLORS.forEach((color, j) => {
          if (d.properties[PRIMARY_COL] >= bins[j]) {
            this_color = color;
          }
        })
        return this_color;
      } else {
        return NO_DATA_COLOR;
      }
    })
    .each(function(d) {
      if (d.properties[PRIMARY_COL]) {
        this.classList.add("has-data");
      }
    })

  return { bins }
}

