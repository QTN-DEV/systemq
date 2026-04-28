import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { type ImgHTMLAttributes, useEffect, useState } from "react";
// Optional: import { Loader2, ImageOff } from "lucide-react"; // Common icons

export type ImageProps = ImgHTMLAttributes<HTMLImageElement>;

export function Image(props: ImageProps) {
    const { src, className, ...rest } = props;
    const [imgSrc, setImgSrc] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const session = useAuthStore.getState().getCurrentSession();

    useEffect(() => {
        setIsLoading(true);
        setHasError(false);

        if (!src || src.startsWith('data:') || !session?.token) {
            setImgSrc(src);
            setIsLoading(false);
            return;
        }

        let objectUrl: string;

        const fetchImage = async () => {
            try {
                const response = await fetch(src, {
                    headers: {
                        'Authorization': `Bearer ${session.token}`,
                    },
                });

                if (!response.ok) throw new Error("Failed to fetch image");

                const blob = await response.blob();
                objectUrl = URL.createObjectURL(blob);
                setImgSrc(objectUrl);
                setIsLoading(false);
            } catch (error) {
                console.error("Image load failed:", error);
                setHasError(true);
                setIsLoading(false);
                setImgSrc(src);
            }
        };

        fetchImage();

        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [src, session?.token]);

    return (
        <div data-name="custom-image" className={cn("relative overflow-hidden flex items-center justify-center bg-muted", className)}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-secondary animate-pulse">
                    <span className="text-xs text-muted-foreground">Loading...</span>
                </div>
            )}

            {hasError && !isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 text-destructive">
                    <span className="text-[10px] font-medium">Failed to load</span>
                </div>
            )}

            <img
                src={imgSrc}
                className={cn(
                    "h-full w-full object-cover transition-opacity duration-300",
                    isLoading ? "opacity-0" : "opacity-100"
                )}
                {...rest}
                onError={() => setHasError(true)}
            />
        </div>
    );
}