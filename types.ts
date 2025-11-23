export interface HairstyleConfig {
  id: number;
  label: string;
  promptDescription: string;
}

export interface GeneratedImage {
  id: number;
  config: HairstyleConfig;
  imageUrl: string | null;
  status: 'pending' | 'loading' | 'success' | 'error';
  errorMessage?: string;
}

export interface ImageUploadProps {
  onImageSelected: (base64: string) => void;
}
