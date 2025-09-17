- translate the inferences to map coordinates
- make sure that rows in inferences have unique xyz model/ver
- grab user location instead of asking for coords
- also support a search box

- make the arrow in the popup go up or down depending on where it is?
- refine the map loading process. when should it jump to your location?
- add profile page
- tinder like thing that will help train the model

Write a doc about how the authentication and permissions work in this project. Make sure to note about stuff that will be needed to use this as well as refactor it in the future

I want you to put the training page And relevant endpoints behind a new permission that users must have in order to view and the write to to training data

update the document to detail that the permissions Strings are all stored in the constants file and All permissions should follow the same convention. After that update the files that you Just modified to follow this convention

- have a tiles currency that gives you the ability to scan tiles
- you can get more tiles by training lmao

- figure out what is needed to upload an image to the dataset
  - CreateML JSON looks simple https://roboflow.com/formats/createml-json
  - COCO JSON looks widely supported https://roboflow.com/formats/coco-json
- CreateML JSON is so much simpler to write thooooo

## Uploading Images To Roboflow

1. create CreateML.json for image NAME
2. hit the .../upload endpoint
3. roboflow will return an image ID
4. hit the .../annotate/:image-id endpoint with createml.json

## DONE: storing user training data

I want the training feedback page to be extremely simple on mobile where it just asks the user a question along with a satellite image: Is this a basketball court? And the user can say yes or no and then submit their feedback. After they submit their feedback they should be shown a new question. Each time they're shown a question the satellite image should zoom in on the relevant area. The user should be able to do this until they have given feedback on every entry in "inference_predictions". Store the results in the convex table "feedback_submissions". Use as many existing components as you can

Let's show the user how many predictions they have left to evaluate this number should not include ones they have skipped

## 8-27-25

- DONE: make the training UI look nicer
- DONE: add job to aggregate feedback submissions and send it to roboflow
- some ideas to think on
  - implementing a currency system?
  - allowing users to set the radius of their scan (gotta store the radius)
  - having the scan radius larger in production

## DONE: Support different map styles

- the satellite view is sometimes too much
- having support for the street map (light and dark!) would be nice
- should just have to change a string in the mapbox api request

## Fixing Multiple detections at edges of satellite images

-  please group courts that are the same type and really close to each other together into 1 marker. 