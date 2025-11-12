const topojson = require("topojson")
const fs = require("fs")

try {
  fs.mkdirSync("../html/topojson/");
} catch (ex) {
  console.log(ex);
}

handle_geojson_file("./geojson/cb_2024_us_cd119_500k.json", "../html/topojson/cd_topojson.json");

function handle_geojson_file(file, dest) {
  var merged_geojson = JSON.parse(fs.readFileSync(file, "utf-8"));
  var alaska_geojson = JSON.parse(fs.readFileSync(file, "utf-8"));
  var all_states = merged_geojson.features.filter(function(feature) {
    if (feature.properties.STATEFP*1 ==2 ) {return false;}
    if (feature.properties.STATEFP*1 <= 56) {return true;}
    return false;
  })
  
  var alaska = merged_geojson.features.filter(function(feature) {
    if (feature.properties.STATEFP*1 == 2) {return true;}
    return false;
  })
  
  merged_geojson.features = all_states;
  alaska_geojson.features = alaska;
  
  /*We don't need nearly as much detail on the Alaska shape as, say, small dense urban districts,
  and it takes up a comparatively large amount of bandwidth, so, simplify that one more*/
  var alaska_topo = topojson.topology({districts: alaska_geojson})
  alaska_topo = topojson.presimplify(alaska_topo);
  alaska_topo = topojson.simplify(alaska_topo, 0.001);
  alaska_topo = topojson.quantize(alaska_topo, 1e05);
  var alaska_simplified = topojson.feature(alaska_topo, alaska_topo.objects.districts);
  merged_geojson.features = merged_geojson.features.concat(alaska_simplified.features);
  
  var merged_topo = topojson.topology({districts: merged_geojson})
  merged_topo = topojson.presimplify(merged_topo);
  merged_topo = topojson.simplify(merged_topo, 0.0001);
  merged_topo = topojson.quantize(merged_topo, 1e06);
  
  fs.writeFileSync(dest, JSON.stringify(merged_topo), "utf-8");

  console.log("Successfully created " + dest);
}
