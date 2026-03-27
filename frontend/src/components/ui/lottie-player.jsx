import { Suspense, lazy } from "react";

const Lottie = lazy(() => import("lottie-react"));

export function LottiePlayer({ animationData, className = "", loop = true }) {
  if (!animationData) {
    return (
      <div className={`lottie-frame ${className}`}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className={`lottie-frame ${className}`}>
          <div className="loading-spinner" />
        </div>
      }
    >
      <Lottie animationData={animationData} loop={loop} className={className} />
    </Suspense>
  );
}
