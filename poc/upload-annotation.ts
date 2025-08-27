const ROBOFLOW_SETTINGS = {
  apiKey: process.env.ROBOFLOW_API_KEY || '',
  datasetName: 'satellite-sports-facilities-bubrg',
  workspaceName: process.env.ROBOFLOW_WORKSPACE_NAME || '',

  imageId: 'RHVb27popleOc5aFCZHJ',
  imageName: 'test-123.jpg',
};

interface CreateMLAnnotation {
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

interface UploadResponse {
  success: boolean;
  message: string;
  data?: any;
}

class RoboflowAnnotationUploader {
  private apiKey: string;
  private datasetName: string;
  private workspaceName: string;

  constructor(apiKey?: string, datasetName?: string, workspaceName?: string) {
    this.apiKey = apiKey || ROBOFLOW_SETTINGS.apiKey;
    this.datasetName = datasetName || ROBOFLOW_SETTINGS.datasetName;
    this.workspaceName = workspaceName || ROBOFLOW_SETTINGS.workspaceName;
  }

  /**
   * Creates a mock annotation for testing purposes
   */
  private createMockAnnotation(imageId: string): CreateMLAnnotation {
    return {
      image: ROBOFLOW_SETTINGS.imageName,
      annotations: [
        {
          label: 'tennis-court',
          coordinates: {
            x: 250,
            y: 250,
            width: 500,
            height: 500,
          },
        },
        {
          label: 'basketball-court',
          coordinates: {
            x: 100,
            y: 750,
            width: 200,
            height: 200,
          },
        },
      ],
    };
  }

  /**
   * Uploads annotation to Roboflow
   */
  async uploadAnnotation(imageId: string): Promise<UploadResponse> {
    try {
      const annotation = this.createMockAnnotation(imageId);

      // Convert to CreateML JSON format
      const annotationJson = JSON.stringify([annotation], null, 2);

      // Create the upload URL
      const uploadUrl = `https://api.roboflow.com/dataset/${this.datasetName}/annotate/${imageId}`;

      // Prepare query parameters
      const params = new URLSearchParams({
        format: 'createml-json',
        name: `${imageId}.json`,
      });

      console.log(`Uploading annotation to: ${uploadUrl}`);
      console.log(`Image ID: ${imageId}`);
      console.log(`Dataset: ${this.datasetName}`);
      console.log(`Workspace: ${this.workspaceName}`);
      console.log(`Annotation content:`);
      console.log(annotationJson);

      // Make the API request
      const response = await fetch(`${uploadUrl}?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          Authorization: `Bearer ${this.apiKey}`,
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
}

async function main() {
  // Get settings from configuration
  const imageId = ROBOFLOW_SETTINGS.imageId;
  const datasetName = ROBOFLOW_SETTINGS.datasetName;
  const workspaceName = ROBOFLOW_SETTINGS.workspaceName;

  // Get API key from environment or use settings
  const apiKey = process.env.ROBOFLOW_API_KEY || ROBOFLOW_SETTINGS.apiKey;

  if (!apiKey) {
    console.error('Error: ROBOFLOW_API_KEY environment variable is required');
    console.error('');
    console.error('Set it in your .env file or export it:');
    console.error('  export ROBOFLOW_API_KEY="your_api_key_here"');
    console.error('');
    console.error('Or update the ROBOFLOW_SETTINGS.apiKey in the script');
    process.exit(1);
  }

  console.log('🚀 Roboflow Annotation Upload POC');
  console.log('=====================================');
  console.log('');
  console.log('📋 Settings:');
  console.log(`   API Key: ${apiKey ? '✓ Set' : '✗ Missing'}`);
  console.log(`   Dataset: ${datasetName}`);
  console.log(`   Workspace: ${workspaceName}`);
  console.log('');

  // Create uploader instance
  const uploader = new RoboflowAnnotationUploader();

  // Upload the annotation
  const result = await uploader.uploadAnnotation(imageId);

  console.log('');
  console.log('📤 Upload Result:');
  console.log('==================');

  if (result.success) {
    console.log('✅ Success!');
    console.log(`📝 ${result.message}`);
    if (result.data) {
      console.log('📊 Response data:', JSON.stringify(result.data, null, 2));
    }
  } else {
    console.log('❌ Failed!');
    console.log(`💥 ${result.message}`);
    if (result.data) {
      console.log('🔍 Error details:', result.data);
    }
  }

  console.log('');
  console.log('✨ POC completed!');
}

// Run the script if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Script failed with error:', error);
    process.exit(1);
  });
}

export { RoboflowAnnotationUploader };
export type { CreateMLAnnotation, UploadResponse };
