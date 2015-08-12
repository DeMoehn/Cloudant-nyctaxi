$( document ).ready(function() {

  // -----------------------
  // - Global Variables -
  // -----------------------

  // -- Database --
  var baseUrl = "https://"+user+":"+pass+"@"+user+".cloudant.com/"; // Base URL of Cloudant

  // -- Map --
  var map; // The map
  var mapViewLat = 40.77820166245534; // Standard view on map for Lat - NYC
  var mapViewLong = -73.9706039428711; // Standard view on map for Long - NYC
  var mapViewZoom = 12; // Standard view on map for Zoom

  var pickupMarkerGroup = L.layerGroup; // LayerGroup for the Pickups

  // -- Variables --
  var onlineStat = false; // Variable for the online Status of the app
  var currentBookmark = "";  // Bookmark cache for paging trough queries
  var searchFinished = false; // Flag for paging trough queries

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

  // -- Load Taxi Pickup positions --
  function getTaxiPickups() {
    var docUrl = baseUrl + db + '/_design/trips/_view/pickups?include_docs=true&limit=100'; // Search for all trips

    function parse (data) { // Call after the ajax is done
      var doc = JSON.parse(data); // Parse JSON Data into Obj. doc
      var myMarkers = Array();
      console.log(doc);
      for(var i=0; i < doc.rows.length; i++) { // Go through each Document and insert into Dropdown
        var myMarker = L.marker([doc.rows[i].doc.geometry.coordinates[1], doc.rows[i].doc.geometry.coordinates[0]], {clickable:true, riseOnHover:true});


        myMarkers.push(myMarker);
      }
      pickupMarkerGroup = L.layerGroup(myMarkers).addTo(map);
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
      docUrl += e.layer._latlngs[0].lng+'%20'+e.layer._latlngs[0].lat // The first Point needs to be the last as well
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
          var point_id = doc.rows[i].doc.id;
          console.log(point_id);
          var popupContent = '<input type="button" value="Test">'
          var myMarker = L.marker([doc.rows[i].doc.geometry.coordinates[1], doc.rows[i].doc.geometry.coordinates[0]], {clickable:true, riseOnHover:true}).bindPopup(popupContent);;
          myMarker.routeNumber = i;
          myMarker.on("mousedown", function(e) {
            $('#routes_combo :nth-child('+e.target.routeNumber+')').prop('selected', true); // To select via index
            $('#routes_combo :nth-child('+e.target.routeNumber+')').change(); // Trigger the change event
            e.id = point_id; // Save the point ID in the event
            createCirclePopup(e);
          });
          myMarkers.push(myMarker);

          if(doc.bookmark) {
            if(doc.bookmark != currentBookmark) {
              ajaxGet(docUrl+"&bookmark="+doc.bookmark, parse);
              currentBookmark = doc.bookmark;
            }else{
              searchFinished = true;
            }
          }
        };

        if(searchFinished) {
          pickupMarkerGroup = L.layerGroup(myMarkers).addTo(map);
          searchFinished = false;
        }
      };

      ajaxGet(docUrl, parse);
    }
  }

  // -----------------------
  // - Helper Functions -
  // -----------------------

  // -- DrawMarkers --
  function drawMarkers() {

  }

  // -- Ajax Get Function --
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

  // -- Things to do on Page start --
  function onStartup() {
    $(".carinfo").hide(); // Hide Car Information Box
    $("#wrapper-status").hide() // Hide the green box on top for status information
    $(".loader").hide(); // Hide the AJAX loader

    map = createMap(); // Create the default map
    getTaxiPickups(); // Load the car data
    setInterval(checkOnline, 1000);   // Check the online status of the app
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

  // --------------------
  // - Start Settings -
  // --------------------

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
