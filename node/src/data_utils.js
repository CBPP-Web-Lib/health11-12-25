import fips_raw from "./fips.csv";
import Papa from "papaparse";

/*Organize fips codes into object*/
const fips = key_by_first(fips_raw)

/**
 * Merges CSV data row into GeoJSON feature property object
 */
function merge_properties(props, data, headers) {
  data.forEach((item, j) => {
    if (j >= 2) {
      props[headers[j]] = item;
    }
  })
  props.state_name = fips[props.STATEFP*1];
  props.full_district_name = props.state_name + " " + props.NAMELSAD;
}

/**
 * Merges all CSV data into the GeoJSON object
 */
function merge_csv(geojson, data, headers) {
  geojson.features.forEach((feature) => {
    var state = feature.properties.STATEFP*1;
    var cd = feature.properties.CD119FP*1;
    if (data[state]) {
      if (data[state][cd]) {
        merge_properties(feature.properties, data[state][cd], headers)
      }
    }
  });
}

/**
 * Determine ideal bin thresholds for data property,
 * assuming we want an equal number of districts
 * in each bin
 */
function binData(cds, prop, bins, rounding) {
  var list = [];
  cds.forEach((feature) => {
    if (feature.properties[prop]) {
      list.push(feature.properties[prop]*1)
    }
  })
  list.sort((a, b) => {return a*1 - b*1});
  var l = list.length;
  var r = [];
  for (var i = 0; i < bins; i++) {
    r.push(list[Math.floor(i/bins*l)])
  }
  r.push(list[l - 1])
  r.forEach((n, i) => {
    n = Math.round(n/rounding)*rounding
    r[i] = n
    if (r[i] === r[i-1]) {
      r[i] += rounding
    }
  })
  r.sort((a, b) => {
    return a -b;
  })
  return r;
}

function parse_csv(d) {
  d = Papa.parse(d).data;
  const header_row = 0;
  const data_start = 1;
  var r = {};
  d.forEach((row, i) => {
    if (i < data_start) {return;}
    row.forEach((cell, j) => {
      var n = cell*1;
      if (!isNaN(n)) {
        row[j] = n;
      } else {
        row[j] = cell;
      }
    })
    var state = row[2]*1;
    var cd = row[3]*1;
    if (typeof(r[state])==="undefined") {
      r[state] = {};
    }
    r[state][cd] = row;
  });
  return {data: r, headers: d[header_row]};
}



function key_by_first(d) {
  var r = {};
  d.forEach((row) => {
    if (row[0]!=="") {
      r[row[0]] = row[1];
    }
  });
  return r;
}

export { merge_csv, binData, parse_csv }