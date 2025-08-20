const ROBOFLOW_SETTINGS = {
  apiKey: process.env.ROBOFLOW_API_KEY || '',
  modelName: 'satellite-sports-facilities-bubrg',
  version: '4',
};

interface RoboflowResponse {
  predictions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    class: string;
  }>;
  image: {
    width: number;
    height: number;
  };
}

/**
 * Sends an image URL to Roboflow for object detection inference
 * @param imageUrl - The URL of the image to analyze
 * @param modelName - The Roboflow model name (default: "your-model")
 * @param version - The model version (default: "42")
 * @returns Promise with the detection results
 */
export async function detectObjectsWithRoboflow(
  imageUrl: string
): Promise<RoboflowResponse> {
  const url = `https://detect.roboflow.com/${ROBOFLOW_SETTINGS.modelName}/${ROBOFLOW_SETTINGS.version}`;

  const params = new URLSearchParams({
    api_key: ROBOFLOW_SETTINGS.apiKey,
    image: imageUrl,
  });

  try {
    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as RoboflowResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Roboflow inference failed: ${error.message}`);
    }
    throw new Error('Roboflow inference failed with unknown error');
  }
}

if (require.main === module) {
  const results = await detectObjectsWithRoboflow(
    `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/-87.6952,41.9442,15,0,0/640x640?access_token=${process.env.MAPBOX_ACCESS_TOKEN}`
  );
  console.log(results);
}
