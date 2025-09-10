import type { CreateMLAnnotation } from './createml';
import { ENV_VARS, ROBOFLOW_MODEL_NAME } from './constants';

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
  imageName,
  apiKey = process.env[ENV_VARS.ROBOFLOW_API_KEY] || '',
  datasetName = ROBOFLOW_MODEL_NAME || '',
  split = 'train',
  batch = process.env[ENV_VARS.ROBOFLOW_BATCH] || 'User Contributed',
}: {
  imageUrl: string;
  imageName: string;
  apiKey?: string;
  datasetName?: string;
  split?: string;
  batch?: string;
}): Promise<{ success: boolean; id: string }> {
  if (!apiKey || !datasetName) {
    throw new Error('Roboflow API key and dataset name are required');
  }

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

export interface AnnotationUploadResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export async function uploadAnnotationToRoboflow({
  imageId,
  annotation,
  apiKey = process.env[ENV_VARS.ROBOFLOW_API_KEY] || '',
  datasetName = ROBOFLOW_MODEL_NAME || '',
  format = 'createml-json',
  name,
}: {
  imageId: string;
  annotation: CreateMLAnnotation;
  apiKey?: string;
  datasetName?: string;
  format?: string;
  name?: string;
}): Promise<AnnotationUploadResponse> {
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
