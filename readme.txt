##PREREQUISITES##

- Spotify API Setup - Spotify MUST be set up so that it is receiving requests from a valid HTTP address and client. 

in order to make the process easier, I have set up a test account that may be used.
//email: infs3208.spotify.test@gmail.com
//password: infsspotify14102022

1. visit https://developer.spotify.com/dashboard/
2. log-in with with provided infs3208 spotify test account
3. click on SpotifyMindReader
4. click on edit settings and add "http://{IP_ADDRESS_OF_CONTAINER}/callback" to the list 

ALTERNATIVELY, to use your own spotify account follow these steps instead

1. visit https://developer.spotify.com/dashboard/ 
2. log in with your own credentials and agree to terms of service
3. create a new app named "SpotifyMindReader"
4. click on edit settings and add "http://{IP_ADDRESS_OF_CONTAINER}/callback" to the list 
5. click on users and access
6. add the email address attached to the spotify account you will be using to the list of users
7. copy client ID and secret to the server.js file 



- Docker compose 

1. call "sudo docker-compose up -d" in the infs320 folder
