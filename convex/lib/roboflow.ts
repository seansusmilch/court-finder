export interface RoboflowPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  class_id: number;
  detection_id: string;
}

export interface RoboflowResponse {
  image: { width: number; height: number };
  inference_id: string;
  predictions: RoboflowPrediction[];
  time: number;
}

export async function detectObjectsWithRoboflow(
  imageUrl: string,
  apiKey: string,
  modelName = 'satellite-sports-facilities-bubrg',
  version = '5'
): Promise<RoboflowResponse> {
  const url = `https://detect.roboflow.com/${modelName}/${version}`;
  const params = new URLSearchParams({ api_key: apiKey, image: imageUrl });
  const response = await fetch(`${url}?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Roboflow HTTP error ${response.status}`);
  }
  return (await response.json()) as RoboflowResponse;
}

export async function uploadImageToRoboflow({
  imageUrl,
  apiKey,
  datasetName,
  imageName,
  split = 'train',
  batch = 'User Contributed',
}: {
  imageUrl: string;
  apiKey: string;
  datasetName: string;
  imageName: string;
  split?: string;
  batch?: string;
}): Promise<{ success: boolean; id: string }> {
  const url = `https://api.roboflow.com/dataset/${datasetName}/upload`;

  const params = new URLSearchParams({
    api_key: apiKey,
    image: imageUrl,
    name: imageName,
    split: split,
    batch: batch,
  });

  const response = await fetch(`${url}?${params.toString()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Roboflow upload HTTP error ${response.status}`);
  }

  const data = await response.json();
  return data;
}

export interface CreateMLAnnotation {
  image: string;
  annotations: Array<{
    label: string;
    coordinates: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data?: any;
}

export async function uploadAnnotationToRoboflow({
  imageId,
  apiKey,
  datasetName,
  annotation,
  format = 'createml-json',
  name,
}: {
  imageId: string;
  apiKey: string;
  datasetName: string;
  annotation: CreateMLAnnotation;
  format?: string;
  name?: string;
}): Promise<UploadResponse> {
  try {
    // Convert to CreateML JSON format
    const annotationJson = JSON.stringify([annotation], null, 2);

    // Create the upload URL
    const uploadUrl = `https://api.roboflow.com/dataset/${datasetName}/annotate/${imageId}`;

    // Prepare query parameters
    const params = new URLSearchParams({
      format: format,
      name: name || `${imageId}.json`,
    });

    // Make the API request
    const response = await fetch(`${uploadUrl}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        Authorization: `Bearer ${apiKey}`,
      },
      body: annotationJson,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: `Successfully uploaded annotation for image ${imageId}`,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to upload annotation: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      data: error,
    };
  }
}
