CreateML JSON
Apple's CreateML and Turi Create tools need a special JSON format for object detection tasks.

Overview
When Apple released CreateML in 2018 it was a groundbreaking innovation. For the first time, developers could easily train a machine learning model with no code. No code, that is, except for the one-off scripts they needed to write to munge their data into the proper JSON format that was adopted from Apple's acquired machine learning framework, Turi Create.

Fortunately, Roboflow can both read and write CreateML JSON files so you can truly train a model and export it for use with an Apple iOS device via CoreML without writing a single line of code. Follow our CreateML tutorial to learn how to use it to train a no-code object detection model.

Format Description
Below, learn the structure of CreateML JSON.

createml.json

```json
[
  {
    "image": "0001.jpg",
    "annotations": [
      {
        "label": "helmet",
        "coordinates": {
          "x": 162.5,
          "y": 45,
          "width": 79,
          "height": 88
        }
      },
      {
        "label": "person",
        "coordinates": {
          "x": 145.5,
          "y": 176,
          "width": 251,
          "height": 350
        }
      }
    ]
  }
]
```
