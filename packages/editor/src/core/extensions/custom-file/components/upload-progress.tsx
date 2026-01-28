import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";

type Props = {
  editor: Editor;
  nodeId: string;
};

export function FileUploadProgress(props: Props) {
  const { editor, nodeId } = props;
  // Displayed status that will animate smoothly (monotonically increasing)
  const [displayStatus, setDisplayStatus] = useState(0);
  // Track the highest value seen to ensure monotonic progress
  const highestValueRef = useRef(0);
  // Animation frame ID for cleanup
  const animationFrameRef = useRef<number | null>(null);
  // subscribe to file upload status
  const uploadStatus = useEditorState({
    editor,
    selector: ({ editor }) =>
      (editor.storage.utility as { assetsUploadStatus?: Record<string, number> } | undefined)?.assetsUploadStatus?.[
        nodeId
      ],
  });

  useEffect(() => {
    // Ensure monotonically increasing progress
    const targetValue = uploadStatus ?? 0;
    if (targetValue > highestValueRef.current) {
      highestValueRef.current = targetValue;
    }
    const monotnicTarget = highestValueRef.current;

    const animateToValue = (start: number, end: number, startTime: number) => {
      const duration = 200;

      const animation = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);

        // Calculate current display value
        const currentValue = Math.floor(start + (end - start) * easeOutCubic);
        setDisplayStatus(currentValue);

        // Continue animation if not complete
        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame((time) => animation(time));
        }
      };
      animationFrameRef.current = requestAnimationFrame((time) => animation(time));
    };

    // Only animate if target is higher than current display
    if (monotnicTarget > displayStatus) {
      animateToValue(displayStatus, monotnicTarget, performance.now());
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [uploadStatus, displayStatus]);

  // SVG circle parameters - size-8 = 32px to match icon container
  const size = 32;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayStatus / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center size-8 rounded bg-custom-background-90 flex-shrink-0">
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        {/* Background circle - light gray */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-custom-border-200"
        />
        {/* Progress circle - accent color */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-custom-primary-100 transition-all duration-200 ease-out"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
          }}
        />
      </svg>
      {/* Percentage text */}
      <span className="text-9 font-medium text-custom-text-200 z-10">{displayStatus}%</span>
    </div>
  );
}
