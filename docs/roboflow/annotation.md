# Upload an Annotation

If you already have existing annotations, along with your images, you can upload them to Roboflow.

{% hint style="success" %}
This works with any of [our supported annotation formats](http://roboflow.com/formats) that use an annotation file that references the file name of the uploaded image.
{% endhint %}

{% hint style="info" %}
Did you know? You can drag and drop (or select) the annotation files along with your images on the Upload page of the app without using the API.
{% endhint %}

{% tabs %}
{% tab title="Python SDK" %}
You can attach annotation files when you upload images via the Python SDK. [See more in the Python SDK reference](https://roboflow.github.io/roboflow-python/core/project/#roboflow.core.project.Project.upload)

#### Example: Uploading a Local Annotation

```python
import glob
from roboflow import Roboflow

# Initialize Roboflow client
rf = Roboflow(api_key="YOUR_PRIVATE_API_KEY")

# Directory path and file extension for images
dir_name = "PATH/TO/IMAGES"
file_extension_type = ".jpg"

# Annotation file path and format (e.g., .coco.json)
annotation_filename = "PATH/TO/_annotations.coco.json"

# Get the upload project from Roboflow workspace
project = rf.workspace().project("YOUR_PROJECT_NAME")

# Upload images
image_glob = glob.glob(dir_name + '/*' + file_extension_type)
for image_path in image_glob:
    print(project.single_upload(
        image_path=image_path,
        annotation_path=annotation_filename,
        # -- optional parameters: --
        # annotation_labelmap=labelmap_path,
        # split='train',
        # num_retry_uploads=0,
        # batch_name='batch_name',
        # tag_names=['tag1', 'tag2'],
        # is_prediction=False,
    ))

```

{% endtab %}

{% tab title="cURL" %}

#### Example

Attaching a [VOC XML annotation](https://roboflow.com/formats/pascal-voc-xml) to an image with ID `abc123` in the `your-dataset` dataset called `YOUR_ANNOTATION.xml`:

```bash
cat YOUR_ANNOTATION.xml | curl -d @- \
"https://api.roboflow.com/dataset/your-dataset/annotate/abc123?\
api_key=YOUR_KEY&\
name=YOUR_ANNOTATION.xml"
```

Attaching a [Darknet TXT annotation](https://roboflow.com/formats/yolo-darknet-txt) to an image with ID `abc123` in the `your-dataset` dataset called `YOUR_ANNOTATION.txt` using a json labelmap - in this case we need to send the contents of the annotation file in a json instead of just sending it as the body.

```bash
#!/bin/bash
# store the annotation as a json-compatible string
txt_content=$(cat YOUR_ANNOTATION.txt | sed 's/\\/\\\\/g; s/"/\\"/g; s/$/\\n/' | tr -d '\n')
# create a json string with the annotation file and the label map [0=flower, 1=leaf]
json_payload="{ \"annotationFile\": \"$txt_content\", \"labelmap\":{\"0\":\"flower\", \"1\":\"leaf\"} }"

# upload the annotation + labelmap
echo $json_payload | curl -H "Content-Type: application/json" -d @- \
"https://api.roboflow.com/dataset/cultura-pepino-dark/annotate/abc123?\
api_key=YOUR_KEY&\
name=YOUR_ANNOTATION.txt"
```

{% endtab %}

{% tab title="JavaScript" %}
We're using [axios](https://github.com/axios/axios) to perform the POST request in this example so first run `npm install axios` to install the dependency.

**Uploading a Local Image**

```javascript
const axios = require('axios');
const fs = require('fs');

const filename = 'YOUR_ANNOTATION.xml';
const annotation = fs.readFileSync(filename, 'utf-8');

axios({
  method: 'POST',
  url: 'https://api.roboflow.com/dataset/your-dataset/annotate/abc123',
  params: {
    api_key: 'YOUR_KEY',
    name: filename,
  },
  data: annotation,
  headers: {
    'Content-Type': 'text/plain',
  },
})
  .then(function (response) {
    console.log(response.data);
  })
  .catch(function (error) {
    console.log(error.message);
  });
```

{% endtab %}

{% tab title="Android and Java" %}

#### Kotlin

#### **Uploading with base64 encoded image:**

```kotlin
import java.io.*
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.util.*

fun main() {
    // Get Image Path
    val filePath = System.getProperty("user.dir") + System.getProperty("file.separator") + "YOUR_IMAGE.jpg"
    val file = File(filePath)

    // Base 64 Encode
    val encodedFile: String
    val fileInputStreamReader = FileInputStream(file)
    val bytes = ByteArray(file.length().toInt())
    fileInputStreamReader.read(bytes)
    encodedFile = String(Base64.getEncoder().encode(bytes), StandardCharsets.US_ASCII)
    val API_KEY = "" // Your API Key
    val DATASET_NAME = "your-dataset" // Set Dataset Name (Found in Dataset URL)

    // Construct the URL
    val uploadURL = "https://api.roboflow.com/dataset/" +
            DATASET_NAME + "/upload" +
            "?api_key=" + API_KEY +
            "&name=YOUR_IMAGE.jpg" +
            "&split=train"

    // Http Request
    var connection: HttpURLConnection? = null
    try {
        // Configure connection to URL
        val url = URL(uploadURL)
        connection = url.openConnection() as HttpURLConnection
        connection.requestMethod = "POST"
        connection.setRequestProperty("Content-Type",
                "application/x-www-form-urlencoded")
        connection.setRequestProperty("Content-Length",
                Integer.toString(encodedFile.toByteArray().size))
        connection.setRequestProperty("Content-Language", "en-US")
        connection.useCaches = false
        connection.doOutput = true

        //Send request
        val wr = DataOutputStream(
                connection.outputStream)
        wr.writeBytes(encodedFile)
        wr.close()

        // Get Response
        val stream = connection.inputStream
        val reader = BufferedReader(InputStreamReader(stream))
        var line: String?
        while (reader.readLine().also { line = it } != null) {
            println(line)
        }
        reader.close()
    } catch (e: Exception) {
        e.printStackTrace()
    } finally {
        connection?.disconnect()
    }
}
main()
```

**Adding an Image Hosted Elsewhere via URL:**

```kotlin
import java.io.BufferedReader
import java.io.DataOutputStream
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

fun main() {
    val imageURL = "https://i.imgur.com/PEEvqPN.png" // Replace Image URL
    val API_KEY = "" // Your API Key
    val DATASET_NAME = "your-dataset" // Set Dataset Name (Found in Dataset URL)

    // Upload URL
    val uploadURL = ("https://api.roboflow.com/dataset/" + DATASET_NAME + "/upload" + "?api_key=" + API_KEY
            + "&name=YOUR_IMAGE.jpg" + "&split=train" + "&image="
            + URLEncoder.encode(imageURL, "utf-8"))

    // Http Request
    var connection: HttpURLConnection? = null
    try {
        // Configure connection to URL
        val url = URL(uploadURL)
        connection = url.openConnection() as HttpURLConnection
        connection.requestMethod = "POST"
        connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
        connection.setRequestProperty("Content-Length", Integer.toString(uploadURL.toByteArray().size))
        connection.setRequestProperty("Content-Language", "en-US")
        connection.useCaches = false
        connection.doOutput = true

        // Send request
        val wr = DataOutputStream(connection.outputStream)
        wr.writeBytes(uploadURL)
        wr.close()

        // Get Response
        val stream = connection.inputStream
        val reader = BufferedReader(InputStreamReader(stream))
        var line: String?
        while (reader.readLine().also { line = it } != null) {
            println(line)
        }
        reader.close()
    } catch (e: Exception) {
        e.printStackTrace()
    } finally {
        connection?.disconnect()
    }
}

main()
```

#### Android (Java)

#### **Uploading with base64 encoded image:**

```java
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

public class UploadLocal {
    public static void main(String[] args) throws IOException {
        // Get Image Path
        String filePath = System.getProperty("user.dir") + System.getProperty("file.separator") + "YOUR_IMAGE.jpg";
        File file = new File(filePath);

        // Base 64 Encode
        String encodedFile;
        FileInputStream fileInputStreamReader = new FileInputStream(file);
        byte[] bytes = new byte[(int) file.length()];
        fileInputStreamReader.read(bytes);
        encodedFile = new String(Base64.getEncoder().encode(bytes), StandardCharsets.US_ASCII);

        String API_KEY = ""; // Your API Key
        String DATASET_NAME = "your-dataset"; // Set Dataset Name (Found in Dataset URL)

        // Construct the URL
        String uploadURL =
                "https://api.roboflow.com/dataset/"+
                        DATASET_NAME + "/upload" +
                        "?api_key=" + API_KEY +
                        "&name=YOUR_IMAGE.jpg" +
                        "&split=train";

        // Http Request
        HttpURLConnection connection = null;
        try {
            //Configure connection to URL
            URL url = new URL(uploadURL);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type",
                    "application/x-www-form-urlencoded");

            connection.setRequestProperty("Content-Length",
                    Integer.toString(encodedFile.getBytes().length));
            connection.setRequestProperty("Content-Language", "en-US");
            connection.setUseCaches(false);
            connection.setDoOutput(true);

            //Send request
            DataOutputStream wr = new DataOutputStream(
                    connection.getOutputStream());
            wr.writeBytes(encodedFile);
            wr.close();

            // Get Response
            InputStream stream = connection.getInputStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(stream));
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println(line);
            }
            reader.close();
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }
}
```

**Adding an Image Hosted Elsewhere via URL:**

```java
import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

public class UploadHosted {
    public static void main(String[] args) {
        String imageURL = "https://i.imgur.com/PEEvqPN.png"; // Replace Image URL
        String API_KEY = ""; // Your API Key
        String DATASET_NAME = "your-dataset"; // Set Dataset Name (Found in Dataset URL)

        // Upload URL
        String uploadURL = "https://api.roboflow.com/dataset/" + DATASET_NAME + "/upload" + "?api_key=" + API_KEY
                + "&name=YOUR_IMAGE.jpg" + "&split=train" + "&image="
                + URLEncoder.encode(imageURL, StandardCharsets.UTF_8);

        // Http Request
        HttpURLConnection connection = null;
        try {
            // Configure connection to URL
            URL url = new URL(uploadURL);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

            connection.setRequestProperty("Content-Length", Integer.toString(uploadURL.getBytes().length));
            connection.setRequestProperty("Content-Language", "en-US");
            connection.setUseCaches(false);
            connection.setDoOutput(true);

            // Send request
            DataOutputStream wr = new DataOutputStream(connection.getOutputStream());
            wr.writeBytes(uploadURL);
            wr.close();

            // Get Response
            InputStream stream = connection.getInputStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(stream));
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println(line);
            }
            reader.close();
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }
}
```

{% endtab %}
{% endtabs %}
