// polar_bear_habitat_zone.js
// Google Earth Engine script to calculate difference in polar bear habitat zones from 2007 to 2023

// https://nsidc.org/learn/parts-cryosphere/sea-ice/quick-facts-about-sea-ice

// Greenland
var greenland = ee.Geometry.Rectangle([-75, 58, -10, 85]);

// Years
// Doing 2007 to 2023 because issues with retireving 2024 data
var years = [2007, 2023];

function getHabitatMask(year) {
  var sst = ee.ImageCollection('NOAA/CDR/OISST/V2_1')
              .filterDate(year + '-01-01', year + '-12-31')
              .select('sst')
              .mean()
              .clip(greenland);

  var ice = ee.ImageCollection('MODIS/006/MOD10A1')
              .filterDate(year + '-01-01', year + '-12-31')
              .select('NDSI_Snow_Cover')
              .mean()
              .unmask(0)
              .clip(greenland);

  // Create binary masks
  // Got information from link above
  var iceMask = ice.gt(15); 
  var sstMask = sst.lt(0); 
  var habitat = sstMask.and(iceMask).rename('habitat');
  var styled = habitat.updateMask(habitat)
                .visualize({palette: ['#004080'], min: 0, max: 1});

  var areaImage = habitat.multiply(ee.Image.pixelArea()).divide(1e6); // km²
  var area = areaImage.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: greenland,
    scale: 5000,
    maxPixels: 1e9
  }).get('habitat');

  return {
    year: year,
    image: styled,
    area: area
  };
}

var res2007 = getHabitatMask(2007);
var res2023 = getHabitatMask(2023);

Map.centerObject(greenland, 3);
Map.addLayer(res2007.image, {}, 'Polar Bear Habitat 2007');
Map.addLayer(res2023.image, {}, 'Polar Bear Habitat 2023');

print('Habitat Area 2007 (km²):', res2007.area);
print('Habitat Area 2023 (km²):', res2023.area);

var areas = ee.Array([res2007.area, res2023.area]);
var chart = ui.Chart.array.values(
  areas,
  0,
  years
).setChartType('ColumnChart')
 .setOptions({
   title: 'Polar Bear Habitat Area (km²)',
   hAxis: {title: 'Year'},
   vAxis: {title: 'Habitat Area (km²)'},
 });

print(chart);
