import type { Doc } from '../_generated/dataModel';

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

export function createCreateMLAnnotationFromPredictions(
  imageName: string,
  predictions: Array<Doc<'inference_predictions'>>
): CreateMLAnnotation {
  const annotations = predictions.map((prediction) => {
    return {
      label: prediction.class,
      coordinates: {
        x: prediction.x,
        y: prediction.y,
        width: prediction.width,
        height: prediction.height,
      },
    };
  });
  return {
    image: imageName,
    annotations,
  };
}
