##PREREQUISITES##

- Spotify API Setup - Spotify MUST be set up so that it is receiving requests from a valid HTTP address and client. 

in order to make the process easier, I have set up a test account that may be used to sign in to the developer dashboard AND the app.
//email: infs3208.spotify.test@gmail.com
//password: infsspotify14102022

1. visit https://developer.spotify.com/dashboard/
2. log-in with with provided infs3208 spotify test account
3. click on SpotifyMindReader
4. click on edit settings and add "http://{IP_ADDRESS_OF_VM}/callback" to the list 

ALTERNATIVELY, to use your own spotify account follow these steps instead

1. visit https://developer.spotify.com/dashboard/ 
2. log in with your own credentials and agree to terms of service
3. create a new app named "SpotifyMindReader"
4. click on edit settings and add "http://{IP_ADDRESS_OF_CONTAINER}/callback" to the list 
5. click on users and access
6. add the email address attached to the spotify account you will be using to the list of users
7. copy client ID and secret to the server.js file 



- Docker compose 

1. start a virtual machine
2. call "sudo docker-compose up -d" in the infs320 folder
3. vist http://{IP_ADDRESS_OF_VM}



- Kubernetes

1. create a standard cluster 
  name: spotifycluster, type: zonal, location: australia-southeast-a
2. go to node pool
  name: spotify-pool
  number of nodes : 3
3. go to nodes
  image type: ubuntu with docker 
  

- google cloud shell / kompose

1. activate google shell in the current project
2. run "gcloud container clusters get-credentials spotifycluster --zone=australia-southeast1-a" to navigate to cluster
3. run the following commands to install kompose
curl -L https://github.com/kubernetes/kompose/releases/download/v1.22.0/kompose-linux-amd64 -o kompose
chmod +x kompose
sudo mv ./kompose /usr/local/bin/kompose

4. upload the zip file and run "cd infs3208"
5. run "kompose convert"
6. run "kubectl apply -f mongo-claim0-persistentvolumeclaim.yaml,mongo-service.yaml,nginx-deployment.yaml,nodejs-app-deployment.yaml,example-net-networkpolicy.yaml,mongo-deployment.yaml,nginx-service.yaml,nodejs-app-service.yaml"


- Other References
nginx/default.conf was adapted from -> TheTips4You (18/02/2021) "NodeJs Nginx Reverse Proxy Docker Compose | Node js Nginx Tutorial | Thetips4you" [source code] https://www.youtube.com/watch?v=QMa0Q1Dg2KU&t=525s&ab_channel=Thetips4you


Spotify API calls used in src/server.js were adapted from -> Maker At Play (1/02/2021) "How to Authenticate and use Spotify Web API" [source code] https://www.youtube.com/watch?v=1vR3m0HupGI&t=1104s&ab_channel=MakerAtPlayCoding
