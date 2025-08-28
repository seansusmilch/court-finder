const ROBOFLOW_SETTINGS = {
  apiKey: process.env.ROBOFLOW_API_KEY || '',
  datasetName: 'satellite-sports-facilities-bubrg',
  workspaceName: process.env.ROBOFLOW_WORKSPACE_NAME || '',

  imageId: 'S2xeqoTdXtwn7s4xTZYv',
  imageName: '2a1302ea-0cc0-4079-8215-073a4a43909a.jpg',
};

type UploadImageResponse = { success: boolean; id: string };

async function uploadImage(): Promise<UploadImageResponse> {
  const url = `https://api.roboflow.com/dataset/${ROBOFLOW_SETTINGS.datasetName}/upload`;

  const params = new URLSearchParams({
    api_key: ROBOFLOW_SETTINGS.apiKey,
    image:
      'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/15/7911/11794@2x?access_token=pk.eyJ1Ijoic2VhbnN1c21pbGNoIiwiYSI6ImNtZWo0bHVkNTA5NmIyc29kZm5sYWl1bWEifQ.GKLz_Ya4ZfArpDeyVs1nfQ',
    name: 'test-123.jpg',
    split: 'train',
    batch: 'User Contributed TEST',
  });

  const response = await fetch(`${url}?${params.toString()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = (await response.json()) as UploadImageResponse;
  return data;
}

if (require.main === module) {
  uploadImage().then((data) => {
    console.log(data);
  });
}

/**
 * Sample OUtput
 * {
  success: true,
  id: "zoIFUMkS8W32JBlbuoBA",
}
 */

export {};
