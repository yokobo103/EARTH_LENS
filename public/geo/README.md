# Derived geographic data

This directory contains web-delivery derivatives produced by `npm run data:geo`. Raw downloads stay under `.cache/geo/` and are not committed. Run all layers with `npm run data:geo`, or one layer with `npm run data:geo -- <id>`.

| layer | resolved source URL(s) | license / use condition | processing | output | size |
| --- | --- | --- | --- | --- | ---: |
| `admin0-countries` | [1](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson) | Natural Earth · Public Domain | 6 fields · simplify 12% keep-shapes · precision 0.001° | `public/geo/admin0-countries.geojson` | 273.2 KiB / 279723 bytes |
| `major-ports` | [1](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_ports.geojson) | Natural Earth · Public Domain | 6 source fields · precision 0.0001° | `public/geo/major-ports.geojson` | 219.8 KiB / 225065 bytes |
| `sea-ice-edges` | [1](https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/shapefiles/shp_median/median_extent_N_03_1981-2010_polyline_v4.0.zip)<br>[2](https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/shapefiles/shp_median/median_extent_N_09_1981-2010_polyline_v4.0.zip)<br>[3](https://noaadata.apps.nsidc.org/NOAA/G02135/south/monthly/shapefiles/shp_median/median_extent_S_03_1981-2010_polyline_v4.0.zip)<br>[4](https://noaadata.apps.nsidc.org/NOAA/G02135/south/monthly/shapefiles/shp_median/median_extent_S_09_1981-2010_polyline_v4.0.zip) | Free and open use; Sea Ice Index citation required (NSIDC policy) | densify 25 km before EPSG:3411/3412 → WGS84 · precision 0.0001° · seasonal hemisphere merge | `public/geo/sea-ice-median-edges.geojson` | 66.0 KiB / 67570 bytes |

## Sea Ice Index citation

Fetterer, F., Knowles, K., Meier, W. N., Savoie, M., Windnagel, A. K. & Stafford, T. (2025). *Sea Ice Index* (G02135, Version 4) [Data Set]. National Snow and Ice Data Center. https://doi.org/10.7265/a98x-0f50. Subset: 1981–2010 monthly median extent polylines for March and September, both hemispheres. Retrieved 2026-08-31.

The sea-ice output preserves observed median-edge geometry while deriving WGS84 coordinates and global winter/summer groupings. It is a climatological reference, not current ice conditions or a navigation product.
