import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../config/keys';

export const uploadToCloudinary = async (
  fileUri: string,
  type: 'image' | 'video' = 'image'
): Promise<string> => {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: type === 'image' ? 'image/jpeg' : 'video/mp4',
    name: `upload_${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`,
  } as any);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/upload`,
    { method: 'POST', body: formData }
  );

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.secure_url;
};