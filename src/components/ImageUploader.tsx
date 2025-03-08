
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Image as ImageIcon, X, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
}

export default function ImageUploader({ onImageSelect }: ImageUploaderProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    // Check if file is an image
    if (!file.type.match('image.*')) {
      toast.error('Please select an image file');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File is too large. Please select an image less than 10MB');
      return;
    }

    // Create image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Pass the file to parent component
    onImageSelect(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <Input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="prescription-image"
      />
      
      {!selectedImage ? (
        <div
          onClick={triggerFileInput}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer bg-secondary/30 hover:bg-secondary/50 animate-fade-in",
            isDragging && "border-primary bg-primary/5"
          )}
        >
          <div className="rounded-full bg-primary/10 p-3 mb-4">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <p className="text-center font-medium mb-1">Upload prescription image</p>
          <p className="text-center text-sm text-muted-foreground mb-4">Drag and drop or click to select</p>
          <div className="flex gap-3">
            <Button onClick={triggerFileInput} type="button" variant="outline" size="sm" className="rounded-full">
              <ImageIcon className="h-4 w-4 mr-2" />
              Gallery
            </Button>
            <Button onClick={triggerFileInput} type="button" variant="outline" size="sm" className="rounded-full">
              <Camera className="h-4 w-4 mr-2" />
              Camera
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden animate-scale-in">
          <img 
            src={selectedImage} 
            alt="Selected prescription" 
            className="w-full object-cover rounded-xl max-h-[400px]"
          />
          <Button
            onClick={removeImage}
            className="absolute top-2 right-2 rounded-full w-8 h-8 p-0 bg-background/80 backdrop-blur-sm text-foreground hover:bg-background"
            variant="outline"
            size="icon"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
