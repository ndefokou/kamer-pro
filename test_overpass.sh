#!/bin/bash

# Bounding box for Yaoundé (approximate, based on map center)
# south,west,north,east
BBOX="3.8,11.45,3.9,11.55"

# Using a heredoc for cleaner query construction
read -r -d '' QUERY <<EOF
[out:json][timeout:25];
(
  node["amenity"~"restaurant|cafe|fast_food|bar|pub|pharmacy|hospital|bank|atm|fuel|school|university|library"]($BBOX);
  node["shop"~"supermarket|mall|department_store|convenience|bakery"]($BBOX);
  node["leisure"~"fitness_centre|sports_centre|park"]($BBOX);
  node["tourism"~"hotel|guest_house|attraction"]($BBOX);
  node["public_transport"="station"]($BBOX);
  node["highway"="bus_stop"]($BBOX);
);
out center 200;
EOF

echo "Testing Overpass API with query:"
echo "$QUERY"

curl -v --data "$QUERY" https://overpass-api.de/api/interpreter
