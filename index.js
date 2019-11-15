'use strict'

function handleSite() { // main function call on page load
    getUserInput(); // Let the magic happen!
}

function handleErrors(response) { // prepares error message for HTTP request errors
    if (response.ok === true) {
        return response.json();
    } else {
        throw new Error("Code " + response.status + " Message: " + response.statusText)
    }
}

function handleQueryParams(params) { // Formats a given params object in the 'key=value&key=value' format
    const queryItems = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    return queryItems.join('&');
}

function encodeLatlong(latLong) { // Encodes lat and long from NPS API json response into a usable format for Google query string
    let newLatLong = latLong.split(" ");
    let latLongMap = newLatLong.map(element => {

        return element.replace(/[^\d\u002d\u002e]/g, '');
    });
    let outputString = latLongMap[0] + ',' + latLongMap[1];
    if (outputString === ",undefined") {
        return "No available data";
    } else return outputString;
}

function buildParkQueryParams(state, limit) { // Prepares the params object for the NPS API
    const params = {
        api_key: "4SdKW63IREqotfaHfzPMAU7fJ9Az9OD5Kabg2Xcg",
        stateCode: state,
        limit: limit
    };
    return params;
}

function buildMapQueryParams(coords, name) { // Prepares the params object for the Google Maps Static API
    let params = {
        key: "AIzaSyDDvSrO4-9C87TaVW3jodmB3UhiXhA66W0",
        q: name,
        zoom: "9"
    };
    if (coords === undefined) {
        return params;
    } else {
        params.center = coords;
        return params;
    }
}

function buildHeader() { // Prepares header for get request
    const options = {
        headers: new Headers({
            "accept": "application/json"
        })
    };
}

function getUserInput() { // Adds an event listener to the page to watch for user input
    $('.js-park-form').submit(e => {
        e.preventDefault();
        let state = $(".js-user-select option:selected").attr("value");
        let lim = $(".js-user-select-limit option:selected").attr("value");
        if (state === "DF") {
            alert("Please select a state before pressing submit");
        }

        if (lim === "DF") {
            alert("Please select the number of results you wish to display");
        } else {
            getParkInfo(state, lim);
        }

    });

}

function getAddress(latLong) { // Uses Geocode API to find the address based on the lat long, uses the first address found if more than one are ofund
    const baseURL = "https://maps.googleapis.com/maps/api/geocode/json?";
    let key = "AIzaSyDDvSrO4-9C87TaVW3jodmB3UhiXhA66W0";
    let queryString = `latlng=${latLong}&key=${key}`;
    let requestString = baseURL + queryString;

    return fetch(requestString)
        .then(response => handleErrors(response))
        .then(function (responseJSON) {
            let addressOutput = responseJSON.results[0].formatted_address;
            return addressOutput;
        })
        .catch(e => alert(e));
}


function getParkInfo(state, limit) { // Fetches data from NPS API
    const baseURL = "https://developer.nps.gov/api/v1/parks?";
    let queryParams = buildParkQueryParams(state, limit);
    let queryString = handleQueryParams(queryParams);
    let getURL = baseURL + queryString;
    let opts = buildHeader();



    fetch(getURL, opts)
        .then(response => handleErrors(response))
        .then(responseJSON => {
            $('.js-results').empty(); // Clear old results if any
            for (let i = 0; i < responseJSON.data.length && i < limit; i++) { // Loop through JSON response obj

                (function (i) {  // IIFE used to allow use of setTimeout inside loop and give google maps API time to complete requests
                    setTimeout(function () {
                        let name = responseJSON.data[i].fullName;
                        let latLong = encodeLatlong(responseJSON.data[i].latLong);
                        let description = responseJSON.data[i].description;
                        let website = responseJSON.data[i].url;
                        let mapURL = "";
                        if (latLong != "No available data") {
                            mapURL = getGoogleMap(name, latLong);
                        } else mapURL = getGoogleMap(name);
                        displayResults(name, latLong, description, website, mapURL);
                    }, 500 * (i + 1));
                })(i);

            }
        })
        .catch(e => alert(e));
}

function getGoogleMap(name, coords) {  //Generates a google maps embed api url
    const baseURl = "https://www.google.com/maps/embed/v1/search?";
    let queryParams = buildMapQueryParams(coords, name);
    let queryString = handleQueryParams(queryParams);
    return baseURl + queryString;
}

function displayResults(name, coords, desc, url, mapurl) {  // Displays the results from the primary NPS API request
    if (coords != "No available data") { //If the could be found for that park
    getAddress(coords).then(addressOutput => { // Then get geocode address and display results
        $('.js-results').append(`
        <div class="park-row-item-container js-park-row-item-container">
            <div class="park-row-item js-park-row-item park-info">
                <h3>${name}</h3>
                <p>${addressOutput}</p>
                <p>${desc}</p>
                <p>${url}</p>
            </div>
            <iframe class="park-row-item js-park-row-item google-map" frameborder="0" src="${mapurl}" allowfullscreen>
    
            </iframe>
        </div>
        `);
    });
    } else {  // Else display results indicating no lat long data was found
        $('.js-results').append(`
        <div class="park-row-item-container js-park-row-item-container">
            <div class="park-row-item js-park-row-item park-info">
                <h3>${name}</h3>
                <p>${coords}</p>
                <p>${desc}</p>
                <p>${url}</p>
            </div>
            <iframe class="park-row-item js-park-row-item google-map" frameborder="0" src="${mapurl}" allowfullscreen>
    
            </iframe>
        </div>
        `);
    }
}

$(handleSite); // Call handleSite function on page load