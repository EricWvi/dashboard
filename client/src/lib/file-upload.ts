import { toast } from "sonner";
import imageCompression from "browser-image-compression";

const compressOptions = {
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  preserveExif: true,
  initialQuality: 0.8,
};

export const fileUpload = async ({
  event,
  onProgress,
  onSuccess,
}: {
  event: React.ChangeEvent<HTMLInputElement>;
  onProgress: (progress: number) => void;
  onSuccess: (response: string) => void;
}) => {
  const files = event.target.files;
  if (!files) return;

  const compressed = await imageCompression(files[0], compressOptions);

  const xhr = new XMLHttpRequest();
  const formData = new FormData();
  formData.append("photos", compressed, files[0].name);

  xhr.open("POST", "/api/upload");

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      const progress = Math.round((event.loaded / event.total) * 100);
      onProgress(progress);
    }
  };

  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      onSuccess(xhr.responseText);
    } else {
      toast("Upload Failed");
    }
  };

  xhr.onerror = () => toast("Network error");

  xhr.send(formData);
};
