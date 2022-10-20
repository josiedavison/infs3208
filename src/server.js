//set client ids
const client_id = "33aa689ba0aa4861b84898901540b3a5"; 
const client_secret = "cda4a775b4184824854c620af8ccb933";

//set API urls for spotify integration
const AUTHORIZE = "https://accounts.spotify.com/authorize";
const TOKEN = "https://accounts.spotify.com/api/token";
const USERNAME = "https://api.spotify.com/v1/me\n";
const ARTISTS = "https://api.spotify.com/v1/me/top/artists?limit=5\n";
const TOPTRACKS =  "https://api.spotify.com/v1/artists/";
const TOPTRACKS2 = "/top-tracks?market=AU\n";
const PLAYLIST = "https://api.spotify.com/v1/users/";
const PLAYLIST2 = "/playlists";
const ADDSONGS = "https://api.spotify.com/v1/playlists/";
const ADDSONGS2 = "/tracks?uris=";


//import required libraries
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const { json } = require('express');
const express = require('express');

const app = express();

app.use(express.static("public"));
app.use(express.json());

app.set('view engine', 'ejs');

const mongoose = require('mongoose');

//here is where we connect to the database
// database connect was adapted from ->  MDN Contributors (07/10/2022) "Express Tutorial Part 3: Using a Database (with Mongoose)" [source code] https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/mongoose
//unfortunately, due to time constraints I did not get to fully implement the database in the code.
//instead, user data will be saved in a map on the server. This is not an ideal solution and should be improved upon in future.
mongoose
  .connect(
    'mongodb://mongo:27017/mydb',
    { useNewUrlParser: true }
  )
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

userDataBase = new Map();



//loading the index page
app.get('/', (req, res) => {
    res.render('index');
})


//loads the spotify log-in page
app.get('/login', (req, res) => {

    var redirect_uri = "CALLBACK"

    let url = AUTHORIZE;
    url += "?client_id=" + client_id;
    url += "&response_type=code";
    url += "&redirect_uri=" + encodeURI(redirect_uri);
    url += "&show_dialog=true";
    url += "&scope=user-read-private user-top-read user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private playlist-modify-public playlist-modify-private";

    res.status(200).json({url: url})

})


//authenticates a user and gets a token
app.post('/getToken', (req, res) => {

    const {code} = req.body;
    const {redirect_uri} = req.body;

    let body = "grant_type=authorization_code";
    body += "&code=" + code;
    body += "&redirect_uri=" + encodeURI(redirect_uri);
    body += "&client_id=" + client_id;
    body += "&client_secret=" + client_secret;


    callAuthorizationApi(body, res);

})


//performs the api call for spotify authentication
async function callAuthorizationApi(body, resInherited){

    //get the authentication token via an api call to spotify
    const res = await fetch(TOKEN, {
        method: "POST",
        headers : {
            'Content-Type' : 'application/x-www-form-urlencoded',
            'Authorization' : 'Basic ' + btoa(client_id + ":" + client_secret)
        },
        body: body

    });

    var access_token = null;
    var refresh_token = null;
    if (res.status == 200){
        var data = await res.json();
        if (data.access_token != undefined){
            access_token = data.access_token;
        }
        if( data.refresh_token != undefined){
            refresh_token = data.refresh_token;

        }

    }
    else {
        console.log("there was an error ");
    }

    //get the username for user via an api call to spotify 
    const user = await fetch(USERNAME, {
        method: "GET",
        headers : {
            'Content-Type' : 'application/json',
            'Authorization' : 'Bearer ' + access_token
        }

    });

    var userdata = await user.json();
    var username = userdata.id;
  
    userDataBase.set(userdata.id + "access_token", access_token);
  
  
    //send username back to user, to be used as a session ID
    resInherited.status(200).send({username: username});

}


//load the callback page
app.get('/callback', (req, res) => {
    console.log('on the callback');
    res.render('callback');
})

//inserts user data to the database
app.post('/submit', (req, res) => {
    const {energyValue} = req.body;
    const {moodValue} = req.body;
    const {username} = req.body;

    console.log("user name is " + username);

    //set energy and mood
    userDataBase.set(username +"energy", energyValue)
    userDataBase.set(username +"mood", moodValue)

    res.status(200).send({status: "success"});

})

//load page 2 of questions
app.get('/page2', (req, res) => {
    res.render('page2');
})

//create a playlist based on provided and stored user data
app.post('/page2/createPlaylist', (req, res) =>{

    //get data from request
    const {artist} = req.body;
    const {genre} = req.body;
    const {username} = req.body;

    //storegenre for later use 
    userDataBase.set(username +"selectedGenre", genre);

    getRecommendations(artist, genre, username, res);
    
})

//get the reccomended songs and add them to a new playlist via API calls to spotify
async function getRecommendations(artist, genre, username, resInherited){


    var artistID = userDataBase.get(username+"artistsUris")[parseInt(artist)];
    console.log("selected artist id is " + artistID);

  
    var selectedArtist = userDataBase.get(username+"artists")[parseInt(artist)];
    userDataBase.set(username+"selectedArtist", selectedArtist);
    console.log("the selected artist is " + selectedArtist);


    //in order to get recommended tracks, we need to provide spotify with at least one track
    //so we should get the top track from the user selected artist
    const resTrack = await fetch(TOPTRACKS + artistID + TOPTRACKS2, {
        method: "GET",
        headers : {
            'Content-Type' : 'application/json',
            'Authorization' : 'Bearer ' + userDataBase.get(username +"access_token")
        }

    });

    var tracksData = await resTrack.json();

    var trackID = tracksData.tracks[0].id;


    //get recommendations from spotify 
    var energyV = userDataBase.get(username +"energy");
    console.log("energy level is " + energyV);
    var moodV = userDataBase.get(username +"mood");
    console.log("mood level is " + moodV);

    var recomendationString =`https://api.spotify.com/v1/recommendations?limit=10&seed_artists=${artistID}&seed_genres=${genre}&seed_tracks=${trackID}&target_energy=${energyV}&target_valence=${moodV}`;

    const resRecommendations = await fetch(recomendationString, {
        method: "GET",
        headers : {
            'Content-Type' : 'application/json',
            'Authorization' : 'Bearer ' + userDataBase.get(username +"access_token")
        }

    });

    var recommendationsData = await resRecommendations.json();
    var recommendations = [];

    //save reccomendations 
    for(i = 0; i <10; i++){
        recommendations.push(recommendationsData.tracks[i].uri);
    }
    userDataBase.set(username +"recommendations", recommendations);



    //create a playlist
    let body = {};
    body.name = "Mood Playlist";
    body.description = "A playlist for your mood today";
    body.public = true;


    const resCreatePlaylist = await fetch(PLAYLIST + username + PLAYLIST2, {
        method: "POST",
        headers : {
            'Content-Type' : 'application/json',
            'Authorization' : 'Bearer ' + userDataBase.get(username +"access_token")
        },
        body: JSON.stringify({
            "name": "Mood Playlist",
            "description": "A playlist for your mood today.",
            "public": true

        })

    });


    var playlistData = await resCreatePlaylist.json();
    var playlistID = playlistData.id;

    //add songs to playlist
    var playlistUrl = ADDSONGS + playlistID + ADDSONGS2;
    for(i=0; i < 10; i++){
        playlistUrl = playlistUrl + recommendations[i];
        if( i < 9){
            playlistUrl = playlistUrl + "%2C";
        }

    }

    const resAddSongs = await fetch(playlistUrl, {
        method: "POST",
        headers : {
            'Content-Type' : 'application/json',
            'Authorization' : 'Bearer ' + userDataBase.get(username +"access_token")
        },

    });


    resInherited.status(200).send({playlistID: playlistID});


}


//gets a users top 5 artists and their images via spotify API 
app.get('/page2/getArtists/:username', (req, res) => {
  
    console.log("getting top artists fro " +req.params.username);

    getTopArtists(req.params.username, res);
    

})

//performs the api call to spotify, in order to receive top artists
async function getTopArtists(username, resInherited){

    //get 5 top artists from spotify
    const user = await fetch(ARTISTS, {
        method: "GET",
        headers : {
            'Content-Type' : 'application/json',
            'Authorization' : 'Bearer ' + userDataBase.get(username +"access_token")
        }

    });

    //save artists names and uris 
    var topartists = [];
    var topartistsuris = [];
    var images = "";
    var artistdata = await user.json();
    for (let i = 0; i< 5; i++){
        images = images + artistdata.items[i].images[0].url + ",";
        topartists.push(artistdata.items[i].name);
        topartistsuris.push(artistdata.items[i].id);
    }
  
    console.log("top artists are" + topartists);
    userDataBase.set(username+"artists", topartists);
    userDataBase.set(username+"artistsUris", topartistsuris);




    //send image url back to user
    resInherited.status(200).send({images: images});

}


//loads results page
app.get('/page3', (req, res) => {
    res.render('page3');
})

//get information about user requests to present back to user
app.get('/page3/getInfo/:username', (req, res) => {
    var username = req.params.username;

    res.status(200).send({
        energy : userDataBase.get(username +"energy"),
        valence : userDataBase.get(username +"mood"),
        genre : userDataBase.get(username +"selectedGenre"),
        artist : userDataBase.get(username +"selectedArtist")
    });
  
  //delete all saved information
  userDataBase.delete(username + "energy");
  userDataBase.delete(username + "mood");
  userDataBase.delete(username + "selectedGenre");
  userDataBase.delete(username + "selectedArtist");
  userDataBase.delete(username + "recommendations");
  userDataBase.delete(username + "artists");
  userDataBase.delete(username + "artistsUris");

})


const PORT = 8080;
const HOST = '0.0.0.0';

app.listen(PORT, HOST);
