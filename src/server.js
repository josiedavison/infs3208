//set constant variables

const client_id = "33aa689ba0aa4861b84898901540b3a5"; 
const client_secret = "cda4a775b4184824854c620af8ccb933";

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




//variables that need to go in the database later
var access_token = null;
var refresh_token = null;
var username = null;

var energy = null;
var mood = null;

var artists = [];
var artistsUris = [];
var selectedArtist = null;
var selectedGenre = null;

var reccomendations = [];
var playlistID = null;


//import requirements 
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

//import database
const mongoose = require('mongoose');


//from https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/mongoose
mongoose
  .connect(
    'mongodb://mongo:27017/mydb',
    { useNewUrlParser: true }
  )
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

const Schema = mongoose.Schema;

const userDataSchema = new Schema({
  username : String,
  access_token : String,
  refresh_token : String,
  genre : String,
  mood : String,
  artists : [String],
  artistsUris : [String],
  selectedArtist : String, 
  selectedGenre : String,
  reccommendations : [String], 
  playlistID : String 
});




const { json } = require('express');
const express = require('express');

const app = express();

app.use(express.static("public"));
app.use(express.json());

app.set('view engine', 'ejs');


//logic for loading the index page
app.get('/', (req, res) => {
    res.render('index');
})


//logic for authenticating a user 
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


//logic for geting an authenticated token for a user
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
    username = userdata.id;
  


  
    //send username back to user, to be used as a session ID
    resInherited.status(200).send({username: username});
  


}


//load the callback paged
app.get('/callback', (req, res) => {
    console.log('on the callback');
    res.render('callback');
})

//load user data into the database 
app.post('/submit', (req, res) => {
    const {energyValue} = req.body;
    const {moodValue} = req.body;
    const {username} = req.body;


    //set energy and mood
    energy = energyValue;
    mood = moodValue;

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
    selectedGenre = genre;

    getRecommendations(artist, genre, username, res);


    
})

//get the reccomended songs and add them to a new playlist via API calls to spotify
async function getRecommendations(artist, genre, username, resInherited){


    var artistID = artistsUris[parseInt(artist)];

    selectedArtist = artists[parseInt(artist)];


    //in order to get recommended tracks, we need to provide spotify with at least one track
    //get the top track from the user selected artist
    const resTrack = await fetch(TOPTRACKS + artistID + TOPTRACKS2, {
        method: "GET",
        headers : {
            'Content-Type' : 'application/json',
            'Authorization' : 'Bearer ' + access_token
        }

    });

    var tracksData = await resTrack.json();

    var trackID = tracksData.tracks[0].id;


    //get recommendations from spotify 

    var recomendationString =`https://api.spotify.com/v1/recommendations?limit=10&seed_artists=${artistID}&seed_genres=${genre}&seed_tracks=${trackID}&target_energy=${energy}&target_valence=${mood}`;

    const resRecommendations = await fetch(recomendationString, {
        method: "GET",
        headers : {
            'Content-Type' : 'application/json',
            'Authorization' : 'Bearer ' + access_token
        }

    });

    var recommendationsData = await resRecommendations.json();

    //save reccomendations 
    for(i = 0; i <10; i++){
        reccomendations.push(recommendationsData.tracks[i].uri);
    }



    //create a playlist
    let body = {};
    body.name = "Mood Playlist";
    body.description = "A playlist for your mood today";
    body.public = true;


    const resCreatePlaylist = await fetch(PLAYLIST + username + PLAYLIST2, {
        method: "POST",
        headers : {
            'Content-Type' : 'application/json',
            'Authorization' : 'Bearer ' + access_token
        },
        body: JSON.stringify({
            "name": "Mood Playlist",
            "description": "A playlist for your mood today.",
            "public": true

        })

    });


    var playlistData = await resCreatePlaylist.json();
    playlistID = playlistData.id;

    //add songs to playlist
    var playlistUrl = ADDSONGS + playlistID + ADDSONGS2;
    for(i=0; i < 10; i++){
        playlistUrl = playlistUrl + reccomendations[i];
        if( i < 9){
            playlistUrl = playlistUrl + "%2C";
        }

    }

    const resAddSongs = await fetch(playlistUrl, {
        method: "POST",
        headers : {
            'Content-Type' : 'application/json',
            'Authorization' : 'Bearer ' + access_token
        },

    });


    resInherited.status(200).send({playlistID: playlistID});


}


//get the top 5 artists and their images via spotify API 
app.get('/page2/getArtists/:username', (req, res) => {

    getTopArtists(req.params.username, res);
    

})

async function getTopArtists(username, resInherited){

    //get 5 top artists from spotify
    const user = await fetch(ARTISTS, {
        method: "GET",
        headers : {
            'Content-Type' : 'application/json',
            'Authorization' : 'Bearer ' + access_token
        }

    });

    //save artists names and uris 
    var images = "";
    var artistdata = await user.json();
    for (let i = 0; i< 5; i++){
        images = images + artistdata.items[i].images[0].url + ",";
        artists.push(artistdata.items[i].name);
        artistsUris.push(artistdata.items[i].id);
    }



    //send image url back to user
    resInherited.status(200).send({images: images});

}


//logic for page 3
app.get('/page3', (req, res) => {
    res.render('page3');
})

//get information about user requests to present back to user
app.get('/page3/getInfo/:username', (req, res) => {
    res.status(200).send({
        energy : energy,
        valence : mood,
        genre : selectedGenre,
        artist : selectedArtist
    });
  
  //reset information
  access_token = null;
  refresh_token = null;
  username = null;

  energy = null;
  mood = null;

  artists = [];
  artistsUris = [];
  selectedArtist = null;
  selectedGenre = null;

  reccomendations = [];
  playlistID = null;


    

})


const PORT = 8080;
const HOST = '0.0.0.0';

app.listen(PORT, HOST);
