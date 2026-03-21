'use client';

const STEPS = [
  'WASM runtime',
  'Face detection',
  'Hand tracking',
  'Pose estimation',
  'Ready',
];

const STEP_MESSAGES: Record<string, number> = {
  'Loading vision WASM...': 0,
  'Loading face model...': 1,
  'Loading hand model...': 2,
  'Loading pose model...': 3,
  'Ready!': 4,
};

interface LoadingScreenProps {
  message: string;
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  const activeIdx = STEP_MESSAGES[message] ?? -1;

  return (
    <div className="loading-screen">
      <div className="loading-logo">X-RAY</div>
      <div className="loading-ring" />
      <div className="loading-steps">
        {STEPS.map((step, i) => {
          let cls = 'loading-step';
          if (i < activeIdx) cls += ' done';
          else if (i === activeIdx) cls += ' active';
          return (
            <div key={step} className={cls}>
              <span className="loading-step-dot" />
              <span>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
