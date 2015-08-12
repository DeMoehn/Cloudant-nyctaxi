$( document ).ready(function() {

// -----------------------
// - Global Variables -
// -----------------------

  var baseUrl = "https://"+user+":"+pass+"@"+user+".cloudant.com/"; // Base URL of Cloudant
  var speedLine = L.layerGroup; // LayerGroup for single car positions
  var polyLineGroup = L.layerGroup; // LayerGroup for car route
  var markerGroup =  L.layerGroup; // LayerGroup for marker
  var statesGroup = L.layerGroup; // LayerGroup for states
  var heatmapGroup = L.layerGroup; // LayerGroup for the heatmap
  var routesMarkerGroup = L.layerGroup; // LayerGroup for the Route Markers
  var states = Array(); // Array for all the states
  var map; // The map
  var mapViewLat = 50.56928286558243; // Standard view on map for Lat
  var mapViewLong = 10.30517578125; // Standard view on map for Long
  var mapViewZoom = 5; // Standard view on map for Zoom

  var speedGrades = [0, 10, 30, 50, 80, 100, 120, 150]; // The different speed grades
  var colorGrades = ['#FFEDA0', '#FED976', '#FEB24C', '#FD8D3C', '#FC4E2A', '#E31A1C', '#BD0026', '#800026']; // The different colors according to speed

  var onlineStat = false; // Variable for the online Status of the app
  var regions = false; // Indicates if Regions are shown
  var heatmap = false; // Indicates if the heatmap is shown
  var showTheRoutes = true; // Indicates if Routes should be shown on map
  selectRoute = 0; // Route which should be automatically selected

// -------------------------
// - General Functions -
// -------------------------

  // -- Create the default map --
  function createMap() {
    key = 'pk.eyJ1IjoiZGVtb2VobiIsImEiOiJ3TWtKUmFNIn0.PhNsdyuZmBprwq6bNLQjmQ'; // Key to access the MapBox Service
    var mapboxUrl = 'https://{s}.tiles.mapbox.com/v3/demoehn.k6ecah3n/{z}/{x}/{y}.png'; // The URL to the MapBox Service
    var mapboxAttrib = 'Map data © <a href="http://www.mapbox.com/about/maps/" target="_blank">Mapbox</a>'; // The Attributes to show on the bottom of the map
    var mapboxTiles = L.tileLayer(mapboxUrl, {minZoom: 1, maxZoom: 20, attribution: mapboxAttrib}); // Settings for the MapBox Tiles

    var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'; // The URL to the Open Street Maps Service
    var osmAttrib = 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a>'; // The Attributes to show on the bottom of the map
    var osmTiles = new L.TileLayer(osmUrl, {minZoom: 1, maxZoom: 20, attribution: osmAttrib}); // Settings for the OSM Tiles

    map = L.map('map').addLayer(mapboxTiles).setView(new L.LatLng(mapViewLat , mapViewLong), mapViewZoom); // Add the Tiles to the map and set the view to Germany

    var featureGroup = L.featureGroup().addTo(map); // Group for the drawings
    // Definition of leaflet draw
    var options = { position: 'topleft',
                          draw: {
                            polygon: {
                              allowIntersection: false, // Restricts shapes to simple polygons
                              drawError: {
                                color: '#e1e100', // Color the shape will turn when intersects
                                message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
                              },
                              shapeOptions: {
                                color: '#0CF'
                              }
                            },
                            circle: {
                              shapeOptions: {
                                color: '#0CF'
                              }
                            }, // Turns off this drawing tool
                            rectangle: {
                              shapeOptions: {
                                color: '#0CF',
                              }
                            },
                            marker: true,
                            polyline: false,
                          },
                          edit: {
                            featureGroup: featureGroup
                          }
                        };

    var drawControl = new L.Control.Draw(options).addTo(map); // Adds the draw controls to the map
    var baseMaps = { // Adds the ability to choose between Tiles
      "Mapbox": mapboxTiles,
      "OSM": osmTiles
    };

    var overlays = { // Adds the ability to turn different Overlaya on/off
      "Car Points": speedLine,
      "Route Line": polyLineGroup
    };

    L.control.layers(baseMaps, overlays).addTo(map); // Adds the controls to map
    L.control.scale({imperial:false, metric:true}).addTo(map); // Turns off imperial and metric scaling on

    map.on('draw:created', function(e) {
      featureGroup.addLayer(e.layer); // Adds the drawing layer
      handleDrawing(e); // Handles the drawing
    });

    map.on('draw:editstop', function(e) {
      handleDrawing(e);
    });

    featureGroup.on('mouseover', function(e) {featureHovered(e)});
    featureGroup.on('mouseout', function(e) {featureHovered(e)});
    featureGroup.on('click', function(e) {featureClicked(e)});

    function featureHovered(e) {
      console.log(e);
      if(e.type == "mouseover") {
        e.layer.setStyle({color: '#FFF'});
      }else{
        e.layer.setStyle({color: '#0CF'});
      }
    }

    function featureClicked(e) {
      swal({   title: "Search routes again?",
                  text: "Do you want to search the routes in this drawing again?",
                  type: "info",
                  showCancelButton: true,
                  allowOutsideClick: true,
                  confirmButtonColor: "#33CC33",
                  confirmButtonText: "Yes!",
                  closeOnConfirm: false },
                  function(){   swal("Searching...", "We are searching for the routes...", "success"); handleDrawing(e); });
    }

    var legend = L.control({position: 'bottomright'}); // Creates the Speed Legend
    legend.onAdd = function (map) {
      var div = L.DomUtil.create('div', 'info legend');
      labels = [];

      for (var i = 0; i < speedGrades.length; i++) { // loop through our density intervals and generate a label with a colored square for each interval
        div.innerHTML += '<i style="background:' + getColor(speedGrades[i] + 1) + '"></i> ' +speedGrades[i] + (speedGrades[i + 1] ? '&ndash;' + speedGrades[i + 1] + ' km/h<br>' : '+ km/h');
      }
      return div;
    };

    legend.addTo(map);
    $('.legend').hide(); // Hides the legend
    return map;
  }

  // -- Load the available cars into the dropdown --
  function getCars() {
    var docUrl = baseUrl+ db + "/_design/cars/_view/showCars?group_level=1"; // URL to the Cars View (Level 1 = cars, Level 2 = dates)

    function parse (data) { // Call after the ajax is done
      var doc = JSON.parse(data); // Parse JSON Data into Obj. doc
      var carCount = 0; // Count cars
      for(var i=0; i < doc.rows.length; i++) { // Go through each Document and insert into Dropdown
        $("<option data-geo='"+doc.rows[i].value+"' value='"+doc.rows[i].key+"'> Car "+(i+1)+" ("+doc.rows[i].value+" Geo-Points)</option>").appendTo("#cars_combo");
        carCount++; // Increase car count
      }
      $("#mycars").text($("#mycars").html() + " ("+carCount+")"); // Add the number of cars to the heading
    }
    ajaxGet(docUrl, parse); // Make Ajax request
  }

  // -- Show markers on the map for the routes --
  function showRoutes(key) {
    cleanMap();

    var docUrl = baseUrl + db + '/_design/routes/_view/findRoute?key="'+key+'"'; // Search Routes by startkey & endkey via [key, date]

    function parse (data) { // Call after the ajax is done
      var doc = JSON.parse(data); // Parse JSON Data into Obj. doc
      var myMarkers = Array();

      for(var i=0; i < doc.rows.length; i++) { // Go through each Document and insert into Dropdown
        var popupContent = doc.rows[i].value[2];
        var routeNumber = Number(doc.rows[i].value[2].slice(6,doc.rows[i].value[2].length)); // Slice the Route from the String to get the Number
        var myMarker = L.marker([doc.rows[i].value[0], doc.rows[i].value[1]], {clickable:true, riseOnHover:true}).bindPopup(popupContent);
        myMarker.routeNumber = routeNumber;
        myMarker.on("mousedown", function(e) {
          $('#routes_combo :nth-child('+e.target.routeNumber+')').prop('selected', true); // To select via index
          $('#routes_combo :nth-child('+e.target.routeNumber+')').change(); // Trigger the change event
        });
        myMarkers.push(myMarker);
      }
      routesMarkerGroup = L.layerGroup(myMarkers).addTo(map);
    }

    ajaxGet(docUrl, parse); // Make Ajax request
    $( "#centermap" ).click();
  }

  // -- Load the available routes --
  function getRoutes(key) {
    key = key.split(",")[0];
    $("#routes_combo").empty(); // Clear Route ComboBox
    $("#routes_combo").removeAttr("disabled"); // Enable the Route ComboBox

    var docUrl = baseUrl + db + '/_design/cars/_view/showCars?reduce=true&group=true&startkey=["'; // Search Routes by startkey & endkey via [key, date]
    docUrl += key+'","0"]&endkey=["' + key + '","99999999"]&inclusive_end=true';

    function parse (data) { // Call after the ajax is done
      var doc = JSON.parse(data); // Parse JSON Data into Obj. doc
      var routeCount = 0; // Count the routes
      for(var i=0; i < doc.rows.length; i++) { // Go through each Document and insert into Dropdown
        $("<option data-geo='"+doc.rows[i].value+"' value='"+doc.rows[i].key+","+(i+1)+"'> Route "+(i+1)+" ("+doc.rows[i].value+" Geo-Points)</option>").appendTo("#routes_combo");
        routeCount++; // Increase route count
      }
      $("#myroutes").text("My Routes:" + " ("+routeCount+")"); // Add the number of routes to the heading

      if(selectRoute > 0) {
        $('#routes_combo :nth-child('+selectRoute+')').prop('selected', true); // To select route via index
        $('#routes_combo :nth-child('+selectRoute+')').change(); // Trigger the change event
        selectRoute  = 0;
      }
    }
    ajaxGet(docUrl, parse); // Make Ajax request
  }

  // -- Load the Route --
  function drawSpeedLine(key) {
    key = key.split(","); // Create an Array
    if(map.hasLayer(routesMarkerGroup)) { // Hide the Route markers
      map.removeLayer(routesMarkerGroup);
    }

    var docUrl =  baseUrl + db + '/_design/location/_view/short?key="'+key[0]+'_'+key[1]+'"';

    var color = 'red';
    var circles = Array(); // Array for Speed-Points
    var markers = Array(); // Array for Marker
    var latlngs = Array(); // Array for Polyline

    function parse (data) { // After the call is done
      var doc = JSON.parse(data); // Parse JSON Data into Obj. doc
      var pointStart;
      var pointEnd;
      var pointsDeleted = 0;

      doc.rows.forEach(function(point, index, arr) {
        var point_id = point.id;
        point = point.value;

        if(!sameGeoPosition(arr, index)) { // Don't display the points if they have the same position
          latlngs.push([point[1], point[0]]); // Add points to a line

          if(index == 0) { // Create a Marker that shows the start
            var marker = L.marker([point[1], point[0]]).bindPopup("Start").openPopup();
            markers.push(marker);
            pointStart= [point[1], point[0]];
          }else if(index == arr.length-1) { // Create a Marker that shows the end
            var marker = L.marker([point[1], point[0]]).bindPopup("End").openPopup();
            markers.push(marker);
            pointEnd = [point[1], point[0]];
          }

          color = getColor(point[2]);
          var options = {
            color: color,
            fillColor: color,
            fillOpacity: 0.7
          };

          circle = L.circle([point[1],point[0]], 25, options); // x, y, width
          circles.push(circle); // Push all circles to an array which later will be drawn to the map

          circle.on('click', function(e) { // Create a click-event for each circle
            e.id = point_id; // Save the point ID in the event
            createCirclePopup(e);
          });
        }else{ // It may be possible that the last point is the same point as other endpoints
          if(index == arr.length-1) { // Create a Marker that shows the end
            var marker = L.marker([point[1], point[0]]).bindPopup("End").openPopup();
            markers.push(marker);
            pointEnd = [point[1], point[0]];
          }
          pointsDeleted++; // Increase number of deleted points
        }
      });

      var polyline = L.polyline(latlngs, {color: 'black',weight: 2}); // Create a line to display the route & zoom in bounds
      polyLineGroup = L.layerGroup([polyline]).addTo(map);
      speedLine = L.layerGroup(circles).addTo(map); // Draw all circles
      markerGroup = L.layerGroup(markers).addTo(map);
      map.fitBounds(polyline.getBounds()); // Zoom in the bounds of the line

      getStats(key, pointStart, pointEnd, pointsDeleted); // Receive Statistics about the car
    }

    ajaxGet(docUrl, parse);
  }

  // -- Load Regions for Germany --
  function createRegions() {
    regions = !regions; // Toggle the bool value

    if(regions) { // Check if regions are shown or not
      $("#regions").val("Hide Regions"); // Change Button text

      if(states.length > 0) { // Check if regions are already loaded or not
        map.addLayer(statesGroup); // Add states/regions to the map again
      }else{ // Load the regions
        var docUrl = baseUrl + "regions_low" + "/_all_docs?include_docs=true"; // URL of the Playlists view
        function parse (data) {
          var doc = JSON.parse(data); // Parse JSON Data into Obj. doc
          var state;
          doc.rows.forEach(function(point) {
            state = L.geoJson(point.doc); // Create a state/region
            states.push(state); // Add state to the States Array
            state.on('click', function(e) { // Handle to onClick Event
              if(point.doc.properties.VARNAME_1 == null) {
                var statename = point.doc.properties.NAME_1; // German name
              }else{
                var statename = point.doc.properties.VARNAME_1; // English name
              }
                swal({   title: "Search for routes?",
                            text: "Do you want to search the routes for: "+statename+"?",
                            type: "info",
                            showCancelButton: true,
                            allowOutsideClick: true,
                            confirmButtonColor: "#33CC33",
                            confirmButtonText: "Yes!",
                            closeOnConfirm: false },
                            function(){   swal("Searching...", "We are searching for the routes...", "success"); searchRoutesByRegion(point); });
              });
              statesGroup = L.layerGroup(states).addTo(map); // draw the states to the map
          });
        };

        ajaxGet(docUrl, parse);
        map.setView(new L.LatLng(mapViewLat, mapViewLong), mapViewZoom);
      }
    }else{
      $("#regions").val("Show Regions");
      map.removeLayer(statesGroup);
    }
  }

    // --- Function to search and display the routes by Region ---
    function searchRoutesByRegion(region) {
      console.log(region);
      var docUrl = baseUrl+db+"/_design/geoRoutes/_geo/geo"; // Basis Dokument URL
      docUrl += '?g=POLYGON( ('; // Cloudant Geo Polygon

      region.doc.geometry.coordinates[0].forEach(function(latlng) {
        docUrl += latlng[0]+'%20'+latlng[1]+',';
      });
      docUrl += region.doc.geometry.coordinates[0][0][0]+'%20'+region.doc.geometry.coordinates[0][0][1]; // The first Point needs to be the last as well
      docUrl += '))&relation=contains&include_docs=true'; // Alle Punkte die innerhalt des Polygons sind anzeigen

      console.log(docUrl);
    }

  // -- Create a Heatmap with all cardata --
  function createHeatmap(key) {
    key = key.split(","); // Create an Array
    var docUrl = baseUrl + db + '/_design/location/_view/heatmap?limit=10000&key="'+key[0]+'"'; // URL of the Heatmap view

    if(!heatmap) {
      $("#create-heatmap").prop('value', 'Creating Heatmap...');
      $("#create-heatmap").attr("disabled", "disabled");
      ajaxGet(docUrl, parse);
      heatmap = true;
    }else{
      map.removeLayer(heatmapGroup);
      $("#create-heatmap").prop('value', 'Create Heatmap (Select new Car)');
      $("#create-heatmap").attr("disabled", "disabled");
      heatmap = false;
    }

    function parse (data) { // Call after the ajax is done
      var doc = JSON.parse(data); // Parse JSON Data into Obj. doc
      var heatArray = Array();
      var heatmapArray = Array();

      doc.rows.forEach(function(point) {
        heatArray.push([point.value[1],point.value[0]]);
      });

      var heat = L.heatLayer(heatArray, {radius:25, maxZoom: 14});
      heatmapArray.push(heat);
      heatmapGroup =  L.layerGroup(heatmapArray).addTo(map); // draw the states to the map

      $("#create-heatmap").removeAttr("disabled");
      $("#create-heatmap").prop('value', 'Delete Heatmap (or select new car)');
    };
  }

  // -- Load Geodata by drawings --
  function handleDrawing(e) {
    var docUrl = baseUrl+db+"/_design/geoRoutes/_geo/geo"; // Basis Dokument URL

    // Abfrage des Typs der Zeichnung
    if(e.layerType == "circle") {
      docUrl += '?radius='+e.layer._mRadius+'&lon='+e.layer._latlng.lat+'&lat='+e.layer._latlng.lng+'&relation=contains&limit=200&include_docs=true'; // Cloudant Geo doesn't accept LatLong, instead it's LongLat for some reason...
    }else if( (e.layerType == "rectangle") || (e.layerType == "polygon") ) {
      docUrl += '?g=POLYGON( ('; // Cloudant Geo Polygon
      // Füge für jeden Punkt Lat und Lng ein
      e.layer._latlngs.forEach(function(latlng) {
        docUrl += latlng.lat+'%20'+latlng.lng+',';
      });
      docUrl += e.layer._latlngs[0].lat+'%20'+e.layer._latlngs[0].lng // The first Point needs to be the last as well
      docUrl += '))&relation=contains&include_docs=true'; // Alle Punkte die innerhalt des Polygons sind anzeigen
    }else if(e.layerType == "marker"){
      getLocation(e);
    }

    if(e.handler == "edit") {
      swal("Error", "Editing is not supported right now", "error")
    }

    if( (e.layerType == "circle") ||  (e.layerType == "rectangle") || (e.layerType == "polygon") ) {

      function parse (data) { // After the call is done
        var doc = JSON.parse(data); // Parse JSON Data into Obj. doc
        var myMarkers = Array();
        for(var i=0; i < doc.rows.length; i++) { // Go through each Document and insert into Dropdown
          var popupContent = "Device: "+doc.rows[i].doc.DEVICE_ID+"<br/>Car: "+($('#cars_combo').find('option[value="'+doc.rows[i].doc.DEVICE_ID+'"]').index()+1)+"<br/>"+doc.rows[i].doc.name;
          var routeNumber = Number(doc.rows[i].doc.name.slice(6,doc.rows[i].doc.name.length));  // Slice the Route from the String to get the Number
          var myMarker = L.marker([doc.rows[i].geometry.coordinates[0], doc.rows[i].geometry.coordinates[1]], {clickable:true, riseOnHover:true}).bindPopup(popupContent);
          myMarker.routeNumber = routeNumber;
          myMarker.carNumber = doc.rows[i].doc.DEVICE_ID;
          myMarker.on("mousedown", function(e) {
            showTheRoutes = false; // Routes should not be loaded from car data
            selectRoute = e.target.routeNumber;
            $('#cars_combo').find('option[value="'+e.target.carNumber+'"]').prop('selected', true); // To select Car via value
            $('#cars_combo').find('option[value="'+e.target.carNumber+'"]').click(); // Trigger car button
          });
          myMarkers.push(myMarker);
        };
        if(doc.rows.length > 0) {
          map.setView([doc.rows[0].geometry.coordinates[0], doc.rows[0].geometry.coordinates[1]], 6);
        };
        routesMarkerGroup = L.layerGroup(myMarkers).addTo(map);
      };

      ajaxGet(docUrl, parse);
    }
  }


// -----------------------
// - Helper Functions -
// -----------------------

  // -- Things to do on Page start --
  function onStartup() {
    $(".carinfo").hide(); // Hide Car Information Box
    $("#wrapper-status").hide() // Hide the green box on top for status information
    createMap(); // Create the default map
    getCars(); // Load the car data
    setInterval(checkOnline, 1000);   // Check the online status of the app
  }

  // -- Check if Geo-Position is the same (including noise of the last 3 digits) --
  function sameGeoPosition(arr, index) {
    function trunc(num) {
      return Math.trunc(num*1000); // Truncate the last 3 digits the eliminate noise
    }
    if(index != 0) { // Check if it's not the first position
      if( (trunc(arr[index-1].value[0]) == trunc(arr[index].value[0])) && (trunc(arr[index-1].value[1]) == trunc(arr[index].value[1])) ) {
        return true;
      }else{
        return false;
      }
    }else{
      return false; // If it's the first position, it can't be the same as before
    }
  }

  // -- Create the PopUp of the Speedpoint that show different information --
  function createCirclePopup(e) {
    var obj = e.target;
    var docUrl = baseUrl + db + '/' + e.id;

    if(!obj.speed) { // If circle.speed does not exist, load it. If it does, don't load it again!
      function parse(data) {
        var doc = JSON.parse(data);

        obj.eventtime = "<b>Event-Time: </b>"+String(doc.EVENT_TIME)+"<br />";
        obj.speed = "<b>Speed: </b>"+String(doc.SPEED)+" km/h<br />";
        obj.altitude = "<b>Altitude: </b>"+String(doc.geometry.coordinates[2])+" m<br />";
        obj.direction = "<b>Direction: </b>"+String(doc.DIRECTION)+" Degree<br />";
        obj.geo = "<b>Geo: </b>"+String(doc.geometry.coordinates[0])+" | "+String(doc.geometry.coordinates[1])+"<br />";
        obj.bindPopup(obj.eventtime+obj.speed+obj.altitude+obj.direction+obj.geo);
        getLocation(e);
        obj.openPopup();
      }

      ajaxGet(docUrl, parse);
    }
  }

  // -- Get Location for circle and pointer by latLong --
  function getLocation(eobj) {
    var geocoder = new google.maps.Geocoder();
    if(eobj.latlng) { // Leaflet uses "latlng" and leaflet:draw uses layer._latlng
      var latlng = new google.maps.LatLng(eobj.latlng.lat, eobj.latlng.lng);
    }else{
      var latlng = new google.maps.LatLng(eobj.layer._latlng.lat, eobj.layer._latlng.lng);
    }

    if (geocoder) {
      geocoder.geocode({'latLng': latlng}, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          resp = results[0].formatted_address;
        }else{
          resp = 'No location found';
        }
        if(eobj.type=="click") { // It's a car position
          eobj.target.bindPopup(eobj.target._popup._content+"<b>Location: </b>"+resp+"<br />");
        }else if(eobj.type=="draw:created") { // it's a handmade marker
          eobj.layer.bindPopup("<b>Location: </b>"+resp+"<br />"+"<b>Geo: </b>"+eobj.layer._latlng.lat+","+eobj.layer._latlng.lng+"<br />").openPopup();
        }
      });
    }
  }

  // -- Load Statistics --
  function getStats(key, start, end, deleted) {
    var docUrl = baseUrl + db + '/_design/cars/_view/stats?startkey=["'+key[0]+'","'+key[1]+'"]'; // Search Routes by startkey & endkey via [key, date]
    docUrl += '&endkey=["'+key[0]+'","'+key[1]+'"]&inclusive_end=true&group_level=1';


    function parse (data) { // After the call is done
      var doc = JSON.parse(data); // Parse JSON Data into Obj. doc
      var obj = doc.rows[0].value;

      $(".carinfocontent").html(
        "<b>Real Geo-Points: </b>"+String(obj.count-deleted)+"<br />"
        +"<b>Max Speed: </b>"+obj.max+" km/h <br />"
        +"<b>Min Speed: </b>"+obj.min+" km/h <br />"
        +"<b>Avg Speed: </b>"+String(Math.round(obj.sum/obj.count))+" km/h <br />"
        +"<b>Start-Point: </b>"+start[0]+" | "+start[1]+"<br />"
        +"<b>End-Point: </b>"+end[0]+" | "+end[1]+"<br />"
      );

      saveRoute(start[0],start[1],key)
    }

    ajaxGet(docUrl, parse);
  }

  // - Function to save the start Point of a Route -
  function saveRoute(lat, long, key) {
    routeDoc = {_id:"route:"+key[0]+"_"+key[1],
                      DEVICE_ID:key[0],
                      name: "Route "+key[2],
                      type: "route",
                      geometry: {
                        type: "Point",
                        coordinates: [
                        lat,
                        long
                        ]}};

    $.ajax({
      url: baseUrl+"telematics2",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify(routeDoc),
      error: errorHandler
    }).done(function  (data) {
      var doc = JSON.parse(data);
      $( "#output-data" ).text(JSON.stringify(doc, null, 2));
    });

    //ajaxPost(baseUrl2, routeDoc, parse);
  }

  // -- Check if the Application is online --
  function checkOnline() {
    var online = navigator.onLine;
    if(online) {
      $("#online_status").html("Online");
      $("#status").css("color", "#390");
      if(!onlineStat) {
        onlineStat = true;
        // Sync remote Couch here
      }
    }else{
      $("#online_status").html("Offline");
      $("#status").css("color", "#C30");
      onlineStat = false;
    }
  }

  // -- Get the Color-coding to show car speed --
  function getColor(d) {
    return  d > speedGrades[7]   ? colorGrades[7] :
    d > speedGrades[6]   ? colorGrades[6] :
    d > speedGrades[5]   ? colorGrades[5] :
    d > speedGrades[4]   ? colorGrades[4] :
    d > speedGrades[3]   ? colorGrades[3] :
    d > speedGrades[2]   ? colorGrades[2] :
    d > speedGrades[1]   ? colorGrades[1] :
    colorGrades[0];
  }

  // -- Cleans the Map --
  function cleanMap() {
    if(map.hasLayer(speedLine)) {
      map.removeLayer(speedLine);
    }
    if(map.hasLayer(polyLineGroup)) {
      map.removeLayer(polyLineGroup);
    }

    if(map.hasLayer(markerGroup)) {
      map.removeLayer(markerGroup);
    }

    if(map.hasLayer(routesMarkerGroup)) {
      map.removeLayer(routesMarkerGroup);
    }

    $('.legend').hide();
  }

  // - AJAX GET -
  function ajaxGet(docUrl, func) {
    $.ajax({ // Start AJAX Call
      url: docUrl,
      xhrFields: { withCredentials: true },
      type: "GET",
      error: errorHandler,
      complete: completeHandler
    }).done(func);
  }

  // - Handle AJAX errors -
  function errorHandler(jqXHR, textStatus, errorThrown) {
    $.JSONView(jqXHR, $("#output-data")); // Add the default JSON error data
  }

  // - Handle AJAX Completion -
  function completeHandler(jqXHR, textStatus, errorThrown) {
    $.JSONView(jqXHR, $("#output-data")); // Add the default JSON error data
  }


// --------------------
// - Button events -
// --------------------

  // -- ComboBox: Cars --
  $('#cars_combo').click(function( event ) {
    getRoutes($(this.options[this.selectedIndex]).attr('value'));

    var carsCombo = $('#cars_combo').val().split(","); // Create an Array from the value of Cars Combo

    // Button "Draw Route"
    $("#draw-route").prop('value', 'Draw Route (Car: '+($('#cars_combo option:selected').index()+1)+', Route: select)');
    $("#draw-route").attr("disabled", "disabled");

    // Button "Create Heatmap"
    heatmap = false;
    $("#create-heatmap").prop('value', 'Create Heatmap (Car: '+($('#cars_combo option:selected').index()+1)+')');
    $("#create-heatmap").removeAttr("disabled");

    // Show the routes on the map
    if(showRoutes) {
      showRoutes(Number($(this.options[this.selectedIndex]).attr('value')));
    }
    showTheRoutes = true;
  });

  // -- ComboBox: Routes --
  $('#routes_combo').change(function( event ) {
    var carsCombo = $('#cars_combo').val().split(","); // Create an Array from the value of Cars Combo
    var routesCombo = $('#routes_combo').val().split(","); // Create an Array from the value of Routes Combo
    $("#draw-route").prop('value', 'Draw Route (Car: '+($('#cars_combo option:selected').index()+1)+', Route: '+routesCombo[2]+')');
    $("#draw-route").removeAttr("disabled");
  });

  // -- Button: Create Route --
  $( "#draw-route" ).click(function( event ) {
    cleanMap(); // Clear all previous points from the Map
    drawSpeedLine($('#routes_combo').val()); // Draw the speed line with DEVICE_ID and MaxGeo Points
    $('.legend').show(); // Show legend for cars
    $(".carinfo").show();
  });

  // -- Button: Heatmap --
  $( "#create-heatmap" ).click(function( event ) {
    cleanMap();
    createHeatmap($('#cars_combo').val());
  });

  // -- Button: Show Regions --
  $( "#regions" ).click(function( event ) {
      cleanMap();
      createRegions();
  });

  // -- Button: Clean Map --
  $( "#cleanmap" ).click(function( event ) {
    cleanMap();
    regions = true;
    $("#regions").click();
  });

  // -- Button: Center Map --
  $( "#centermap" ).click(function( event ) {
    map.setView(new L.LatLng(mapViewLat, mapViewLong), mapViewZoom); // Set map to the default values
  });

// --------------------
// - Start Settings -
// --------------------

  // -- Initialize --
  onStartup(); // Call the Function to start everything

}).bind("ajaxSend", function() { // onAjax send
    $(".loader").show();
}).bind("ajaxStop", function() { // onAjax finish
    $(".loader").hide();
}).bind("ajaxError", function() { // onAjax error
    $(".loader").hide();
});
