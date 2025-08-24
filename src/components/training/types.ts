import type { RoboflowPrediction } from '../../../convex/lib/roboflow';

export type { RoboflowPrediction };

export interface TrainingFeedbackItem {
  id: string; // inference._id
  imageUrl: string; // inference.imageUrl
  imageWidth: number; // inference.response.image.width
  imageHeight: number; // inference.response.image.height
  tileInfo: {
    z: number;
    x: number;
    y: number;
  };
  model: string;
  version: string;
  predictions: RoboflowPrediction[]; // from inference.response.predictions
  requestedAt: number;
  userFeedback?: Map<
    string,
    {
      isCourt: boolean;
      comment?: string;
      timestamp: Date;
      userId: string; // ID of the user who provided feedback
    }
  >;
}

export interface FeedbackSubmission {
  itemId: string;
  predictionId: string;
  isCourt: boolean;
  comment?: string;
  userId: string;
}
