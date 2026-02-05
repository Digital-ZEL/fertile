'use client';

interface ConfidenceMeterProps {
  confidence: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/**
 * Visual confidence meter showing 0-100% confidence
 * Uses color gradient: red (low) -> yellow (medium) -> green (high)
 */
export default function ConfidenceMeter({
  confidence,
  size = 'md',
  showLabel = true,
}: ConfidenceMeterProps) {
  // Clamp confidence to 0-100
  const normalizedConfidence = Math.max(0, Math.min(100, confidence));

  // Size configurations
  const sizes = {
    sm: { height: 'h-2', text: 'text-xs', ring: 'h-12 w-12' },
    md: { height: 'h-3', text: 'text-sm', ring: 'h-20 w-20' },
    lg: { height: 'h-4', text: 'text-base', ring: 'h-28 w-28' },
  };

  const sizeConfig = sizes[size];

  // Get color based on confidence level
  const getColor = (value: number) => {
    if (value >= 70) return { bg: 'bg-green-500', text: 'text-green-600', label: 'High' };
    if (value >= 50) return { bg: 'bg-yellow-500', text: 'text-yellow-600', label: 'Medium' };
    if (value >= 30) return { bg: 'bg-orange-500', text: 'text-orange-600', label: 'Low' };
    return { bg: 'bg-red-500', text: 'text-red-600', label: 'Very Low' };
  };

  const color = getColor(normalizedConfidence);

  // Calculate ring progress (for circular variant)
  const circumference = 2 * Math.PI * 40; // radius = 40
  const strokeDashoffset = circumference - (normalizedConfidence / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Circular progress ring */}
      <div className={`relative ${sizeConfig.ring}`}>
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          {/* Background ring */}
          <circle
            className="text-gray-200"
            strokeWidth="8"
            stroke="currentColor"
            fill="none"
            r="40"
            cx="50"
            cy="50"
          />
          {/* Progress ring */}
          <circle
            className={color.text}
            strokeWidth="8"
            strokeLinecap="round"
            stroke="currentColor"
            fill="none"
            r="40"
            cx="50"
            cy="50"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.5s ease-in-out',
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${sizeConfig.text} ${color.text}`}>
            {normalizedConfidence}%
          </span>
        </div>
      </div>

      {/* Label */}
      {showLabel && (
        <div className="text-center">
          <span className={`font-medium ${sizeConfig.text} ${color.text}`}>
            {color.label} Confidence
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Linear confidence bar variant
 */
export function ConfidenceBar({
  confidence,
  showPercentage = true,
}: {
  confidence: number;
  showPercentage?: boolean;
}) {
  const normalizedConfidence = Math.max(0, Math.min(100, confidence));

  const getBarColor = (value: number) => {
    if (value >= 70) return 'bg-green-500';
    if (value >= 50) return 'bg-yellow-500';
    if (value >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-xs text-gray-600">
        <span>Confidence</span>
        {showPercentage && <span>{normalizedConfidence}%</span>}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor(normalizedConfidence)}`}
          style={{ width: `${normalizedConfidence}%` }}
        />
      </div>
    </div>
  );
}
