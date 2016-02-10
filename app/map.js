$( document ).ready(function() {

  // -----------------------
  // - Global Variables -
  // -----------------------

  // -- Database --
  var baseUrl = 'https://'+accountname+'.cloudant.com/'; // Base URL of Cloudant
  var cloudant_auth = btoa(user + ':' + pass); // Creates a Base64 String of the User and Pass

  pDoc = baseUrl+"_session";
  $.post( pDoc, "name="+user+"&password="+pass, function( data ) {
    console.log(data);
  });



  // -- Map --
  var map; // The map
  var mapViewLat = 40.73893324113601; // Standard view on map for Lat - NYC
  var mapViewLong = -73.96236419677734; // Standard view on map for Long - NYC
  var mapViewZoom = 12; // Standard view on map for Zoom

  var taxisLayer = L.geoJson("", {
                                                onEachFeature: function (feature, layer) {
                                                  //bind click
                                                  layer.on({
                                                      click: getTaxiInfo
                                                  });
                                                  layer.bindPopup("");
                                                }
                                              });

  var routesLayer = L.geoJson("", {onEachFeature: function (feature, layer) {
                                              //bind click
                                              layer.bindPopup("");
                                              }
                                              });

  // -- Variables --
  var currentBookmark = "";  // Bookmark cache for paging trough queries
  var searchFinished = false; // Flag for paging trough queries
  var taxisLoaded = false; // Flag is taxis are already loaded

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

    L.control.layers(baseMaps).addTo(map); // Adds the controls to map
    L.control.scale({imperial:false, metric:true}).addTo(map); // Turns off imperial and metric scaling on

    map.on('draw:created', function(e) {
      featureGroup.addLayer(e.layer); // Adds the drawing layer
      handleDrawing(e); // Handles the drawing
    });

    map.on('draw:editstop', function(e) {
      handleDrawing(e);
    });

    return map;
  }

  // -- Load first 200 Taxi Pickup positions --
  function getTaxiPickups() {
    var docUrl = baseUrl + db + '/_design/trips/_view/pickups?include_docs=true&limit=200'; // Search for all trips

    function parse (data) { // Call after the ajax is done
      var doc = JSON.parse(data); // Parse JSON Data into Obj. doc
      var myMarkers = Array();

      for(var i=0; i < doc.rows.length; i++) { // Go through each Document and insert into Dropdown
        console.log(doc.rows[i].doc);
        taxisLayer.addData(doc.rows[i].doc);
      }
      taxisLayer.addTo(map); // Add Info to map
      taxisLoaded = true; // Set Flag to true
    }

    ajaxGet(docUrl, parse); // Make Ajax request
  }

  // -- Load Geodata by drawings --
  function handleDrawing(e) {
    var docUrl = baseUrl+db+"/_design/geoTrips/_geo/geo"; // Basis Dokument URL

    // Abfrage des Typs der Zeichnung
    if(e.layerType == "circle") {
      docUrl += '?radius='+e.layer._mRadius+'&lon='+e.layer._latlng.lng+'&lat='+e.layer._latlng.lat+'&relation=contains&limit=200&include_docs=true'; // Cloudant Geo doesn't accept LatLong, instead it's LongLat for some reason...
    }else if( (e.layerType == "rectangle") || (e.layerType == "polygon") ) {
      docUrl += '?g=POLYGON( ('; // Cloudant Geo Polygon
      // Füge für jeden Punkt Lat und Lng ein
      e.layer._latlngs.forEach(function(latlng) {
        docUrl += latlng.lng+'%20'+latlng.lat+',';
      });
      docUrl += e.layer._latlngs[0].lng+'%20'+e.layer._latlngs[0].lat; // The first Point needs to be the last as well
      docUrl += '))&relation=contains&include_docs=true'; // Alle Punkte die innerhalt des Polygons sind anzeigen
      console.log(docUrl);
    }else if(e.layerType == "marker"){
      getLocation(e);
    }

    if(e.handler == "edit") {
      swal("Error", "Editing is not supported right now", "error");
    }

    if( (e.layerType == "circle") ||  (e.layerType == "rectangle") || (e.layerType == "polygon") ) {

      function parse (data) { // After the call is done
        var doc = JSON.parse(data); // Parse JSON Data into Obj. doc
        var myMarkers = Array();

        for(var i=0; i < doc.rows.length; i++) { // Go through each Document and insert into Dropdown
          var point_id = doc.rows[i].doc.id;

          taxisLayer.addData(doc.rows[i].doc);
          taxisLayer.addTo(map); // Add Info to map

          //Loads all the data by iterating trough the booksmarks
          if(doc.bookmark) {
            if(doc.bookmark != currentBookmark) {
              ajaxGet(docUrl+"&bookmark="+doc.bookmark, parse);
              currentBookmark = doc.bookmark;
            }else{
              searchFinished = true;
            }
          }
        }

        if(searchFinished) {
          pickupMarkerGroup = L.layerGroup(myMarkers).addTo(map);
          searchFinished = false;
        }
      }

      ajaxGet(docUrl, parse);
    }
  }

  // -- Load Taxi Trip information --
  function getTaxiInfo(e) {
    var idArr = e.target.feature._id.split(":");
    var docUrl = baseUrl + db + "/trip:"+idArr[1]+":"+idArr[2]+":"+idArr[3];

    function parse(data) {
      var doc = JSON.parse(data); // Parse JSON Data into Obj. doc

      popupOptions = {maxWidth: 250};

      e.target.bindPopup(
          "<b>#Passengers: </b>" + doc.properties.passenger_count + " Pers." +
          "<br><b>Trip distance: </b>" + doc.properties.trip_distance + " km" +
          "<br><b>Trip duration: </b>" + (doc.properties.trip_time_in_secs/60) + " min" +
          "<br><b>Vendor: </b>" + doc.properties.vendor_id +
          "<br><b>Customer Rating: </b>" + doc.properties.rate_code +
          "<br><br><b><u>Price: </u></b>"+
          "<table><tr><td><b>Trip Price: </b></td><td>" + doc.properties.fare_amount + " $</td></tr>" +
          "<tr><td><b>Tax: </b></td><td>" + doc.properties.mta_tax + " $</td></tr>" +
          "<tr><td><b>Extra Charge: </b></td><td>" + doc.properties.surcharge + " $<td></tr>" +
          "<tr><td><b>Tip: </b></td><td>" + doc.properties.tip_amount + " $</td></tr>" +
          "<tr><td><b>Total Price: </b></td><td>" + doc.properties.total_amount + " $</td></tr>" +
          "<tr><td><b>Payment Type: </b></td><td>" + doc.properties.payment_type + "</td></tr></table><br>", popupOptions);

      function showRoad(latlng, open) {
        var geocoder = new google.maps.Geocoder();
        if (geocoder) {
          geocoder.geocode({'latLng': latlng}, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
              resp = results[0].formatted_address;
            }else{
              resp = 'No location found';
            }
            if(open) {
              e.startName = resp;
              e.target.bindPopup(e.target._popup._content+
                "<b>Start: </b>"+resp+"<br />"+
                '<input type="button" id="draw_route" value="Draw Route" style="margin-top: 5px">'
                ).closePopup().openPopup();
                $( "#draw_route" ).click(function( event ) { drawTaxiRoute(e); });
            }else{
              e.endName = resp;
              e.target.bindPopup(e.target._popup._content+"<b>End: </b>"+resp+"<br />").closePopup();
            }
          });
        }
      }

      start = {};
      start.lat = doc.geometry.coordinates[0][1];
      start.lng = doc.geometry.coordinates[0][0];
      end = {};
      end.lat = doc.geometry.coordinates[1][1];
      end.lng = doc.geometry.coordinates[1][0];
      e.start = start;
      e.end = end;
      showRoad(start, false);
      showRoad(end, true);
    }

    ajaxGet(docUrl, parse); // Make Ajax request
  }

  // -----------------------
  // - Helper Functions -
  // -----------------------

  // Draw Taxi Route
  function drawTaxiRoute(e) {
    $( "#cleanmap" ).click(); // Clean everything
    $( "#centermap" ).click(); // Center map

    var directionsService = new google.maps.DirectionsService();

    var request = {
      origin: new google.maps.LatLng(e.start.lat, e.start.lng),
      destination: new google.maps.LatLng(e.end.lat, e.end.lng),
      travelMode: google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, function(result, status) {
      if (status == google.maps.DirectionsStatus.OK) {
        // returns an array of lat, lon pairs
        myRoute = polyline.decode(result.routes[0].overview_polyline);

        line = makeGeoJSONPolyLine(myRoute);

        var myLines = [{"type": "LineString", "coordinates": line}];
        var startPoint = {"type": "Point", "coordinates": [start.lng, start.lat]};
        var endPoint = {"type": "Point", "coordinates": [end.lng, end.lat]};

        routesLayer.clearLayers();
        routesLayer.addData(startPoint).addTo(map);
        routesLayer.addData(endPoint).addTo(map);
        routesLayer.addData(myLines).addTo(map).bindPopup("<b>Start: </b>"+e.startName+"<br><b>End: </b>"+e.endName).openPopup();
      }
    });

  }

  // -- Creates a GeoJSON Polyline from an Array --
  function makeGeoJSONPolyLine(latLngArr) {
    geoArr = [];
    for(var i in latLngArr) {
      geoArr.push(Array(parseFloat(latLngArr[i][1]), parseFloat(latLngArr[i][0])));
    }

    return geoArr;
  }

  // -- Ajax Get Function --
  function ajaxGet(docUrl, func) {

    $.ajax({ // Start AJAX Call
      url: docUrl,
      type: "GET",
      xhrFields: { withCredentials: true },
      dataType: "json",
      crossDomain: true,
      headers: {'Authorization': 'Basic ' + cloudant_auth, 'Content-Type': 'application/json'},
      error: errorHandler,
      complete: completeHandler,
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

  // -- Create the PopUp of the Speedpoint that show different information --
  function createCirclePopup(e) {
    var obj = e.target;
    var docUrl = baseUrl + db + '/trip:' + e.id; // Read the Trip data
    console.log(docUrl);

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

  // -- Cleans the Map --
  function cleanMap() {
    if(map.hasLayer(taxisLayer)) {
      map.removeLayer(taxisLayer);
    }
    if(map.hasLayer(routesLayer)) {
      map.removeLayer(routesLayer);
    }
  }

  // --------------------
  // - Button events -
  // --------------------

  // -- Button: Clean Map --
  $( "#cleanmap" ).click(function( event ) {
    cleanMap();
  });

  // -- Button: Center Map --
  $( "#centermap" ).click(function( event ) {
    map.setView(new L.LatLng(mapViewLat, mapViewLong), mapViewZoom); // Set map to the default values
  });

  $( "#reload_pickups" ).click(function( event ) {
    $( "#cleanmap" ).click(); // Clean everything
    $( "#centermap" ).click(); // Center map
    if(!taxisLoaded) {
      getTaxiPickups(); // Load the car data
    }else{
      taxisLayer.addTo(map);
    }
  });

  $( "#hide_pickups" ).click(function( event ) {
    if($(this).attr("value") == "Hide Taxis") {
      if(map.hasLayer(taxisLayer)) {
        map.removeLayer(taxisLayer);
      }
      $( "#hide_pickups" ).prop('value', 'Show Taxis');
    }else{
      taxisLayer.addTo(map);
      $( "#hide_pickups" ).prop('value', 'Hide Taxis');
    }
  });

  // --------------------
  // - Start Settings -
  // --------------------

  // -- Things to do on Page start --
  function onStartup() {
    $(".carinfo").hide(); // Hide Car Information Box
    $("#wrapper-status").hide(); // Hide the green box on top for status information
    $(".loader").hide(); // Hide the AJAX loader

    map = createMap(); // Create the default map
    getTaxiPickups(); // Load the car data
  }

  // -- Initialize --
  onStartup(); // Call the Function to start everything

}).bind("ajaxSend", function() { // onAjax send
    $(".loader").show();
    console.log("Showing");
}).bind("ajaxStop", function() { // onAjax finish
    $(".loader").hide();
    console.log("hiding");
}).bind("ajaxError", function() { // onAjax error
    $(".loader").hide();
    console.log("hiding with error");
});
