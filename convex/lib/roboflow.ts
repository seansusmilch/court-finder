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
  const apiStartTs = Date.now();
  const url = `https://detect.roboflow.com/${modelName}/${version}`;

  console.log('request', {
    url: `${url}?api_key=***&image=${imageUrl.substring(0, 50)}...`,
    model: modelName,
    version,
    imageUrl: imageUrl.substring(0, 100),
    hasApiKey: !!apiKey,
  });

  try {
    const params = new URLSearchParams({ api_key: apiKey, image: imageUrl });
    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error('error: http failure', {
        url: `${url}?api_key=***&image=...`,
        status: response.status,
        statusText: response.statusText,
        model: modelName,
        version,
        imageUrl: imageUrl.substring(0, 100),
        durationMs: Date.now() - apiStartTs,
      });
      throw new Error(`Roboflow HTTP error ${response.status}`);
    }

    const data = (await response.json()) as RoboflowResponse;

    console.log('response', {
      model: modelName,
      version,
      imageUrl: imageUrl.substring(0, 100),
      durationMs: Date.now() - apiStartTs,
      predictionsCount: data.predictions?.length ?? 0,
      imageSize: data.image,
      inferenceId: data.inference_id,
      topPredictions: data.predictions?.slice(0, 3).map((p) => ({
        class: p.class,
        confidence: p.confidence,
        detectionId: p.detection_id,
      })),
    });

    return data;
  } catch (error) {
    console.error('error: request failed', {
      url: `${url}?api_key=***&image=...`,
      model: modelName,
      version,
      imageUrl: imageUrl.substring(0, 100),
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : undefined,
      durationMs: Date.now() - apiStartTs,
    });
    throw error;
  }
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
  const apiStartTs = Date.now();

  if (!apiKey || !datasetName) {
    console.error('error: missing required params', {
      hasApiKey: !!apiKey,
      hasDatasetName: !!datasetName,
      imageName,
    });
    throw new Error('Roboflow API key and dataset name are required');
  }

  const url = `https://api.roboflow.com/dataset/${datasetName}/upload`;

  console.log('request', {
    url: `${url}?api_key=***&image=...&name=${imageName}&split=${split}&batch=${batch}`,
    datasetName,
    imageName,
    split,
    batch,
    imageUrl: imageUrl.substring(0, 100),
    hasApiKey: !!apiKey,
  });

  try {
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
      console.error('error: http failure', {
        url: `${url}?api_key=***&image=...&name=${imageName}`,
        status: response.status,
        statusText: response.statusText,
        datasetName,
        imageName,
        durationMs: Date.now() - apiStartTs,
      });
      throw new Error(`Roboflow upload HTTP error ${response.status}`);
    }

    const data = await response.json();

    console.log('response', {
      datasetName,
      imageName,
      durationMs: Date.now() - apiStartTs,
      imageId: data.id,
      success: data.success,
    });

    return data;
  } catch (error) {
    console.error('error: request failed', {
      url: `${url}?api_key=***&image=...&name=${imageName}`,
      datasetName,
      imageName,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : undefined,
      durationMs: Date.now() - apiStartTs,
    });
    throw error;
  }
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
  const apiStartTs = Date.now();
  const annotationName = name || `${imageId}.json`;

  console.log('request', {
    url: `https://api.roboflow.com/dataset/${datasetName}/annotate/${imageId}?format=${format}&name=${annotationName}`,
    datasetName,
    imageId,
    format,
    name: annotationName,
    annotationsCount: annotation.annotations?.length ?? 0,
    hasApiKey: !!apiKey,
  });

  try {
    // Convert to CreateML JSON format
    const annotationJson = JSON.stringify([annotation], null, 2);

    // Create the upload URL
    const uploadUrl = `https://api.roboflow.com/dataset/${datasetName}/annotate/${imageId}`;

    // Prepare query parameters
    const params = new URLSearchParams({
      format: format,
      name: annotationName,
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
      console.error('error: http failure', {
        url: `${uploadUrl}?format=${format}&name=${annotationName}`,
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 200),
        datasetName,
        imageId,
        durationMs: Date.now() - apiStartTs,
      });
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    console.log('response', {
      datasetName,
      imageId,
      durationMs: Date.now() - apiStartTs,
      success: true,
    });

    return {
      success: true,
      message: `Successfully uploaded annotation for image ${imageId}`,
      data: result,
    };
  } catch (error) {
    console.error('error: request failed', {
      url: `https://api.roboflow.com/dataset/${datasetName}/annotate/${imageId}?format=${format}&name=${annotationName}`,
      datasetName,
      imageId,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : undefined,
      durationMs: Date.now() - apiStartTs,
    });
    return {
      success: false,
      message: `Failed to upload annotation: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      data: error,
    };
  }
}
