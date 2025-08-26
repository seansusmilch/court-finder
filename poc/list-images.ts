const ROBOFLOW_SETTINGS = {
  apiKey: process.env.ROBOFLOW_API_KEY || '',
  datasetName: 'satellite-sports-facilities-bubrg',
  workspaceName: process.env.ROBOFLOW_WORKSPACE_NAME || '',

  imageId: 'S2xeqoTdXtwn7s4xTZYv',
};

/**
 * Fetches image data from Roboflow API
 * @param imageId - The ID of the image to fetch
 * @returns Promise with the image data
 */
async function fetchRoboflowImage(imageId: string): Promise<any> {
  const url = `https://api.roboflow.com/${ROBOFLOW_SETTINGS.workspaceName}/${ROBOFLOW_SETTINGS.datasetName}/images/${imageId}?api_key=${ROBOFLOW_SETTINGS.apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching image from Roboflow:', error);
    throw error;
  }
}

// Example usage
async function main() {
  try {
    const imageData = await fetchRoboflowImage(ROBOFLOW_SETTINGS.imageId);
    console.log('Image data:', imageData);
  } catch (error) {
    console.error('Failed to fetch image:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}
