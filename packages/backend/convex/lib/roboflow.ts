export interface RoboflowPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  class_id?: number;
  detection_id?: string;
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
