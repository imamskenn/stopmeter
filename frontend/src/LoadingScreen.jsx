import './LoadingScreen.css';

export default function LoadingScreen() {
  return (
    <div className="stop-loading">
      <div className="stop-loading-content">

        <div className="stop-loading-logo">
          <svg viewBox="0 0 100 100" className="stop-gauge">
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="#383838"
              strokeWidth="2"
            />
            <path
              d="M20 66 A34 34 0 1 1 80 66"
              fill="none"
              stroke="#eeeeee"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="3 5"
            />
            <g className="stop-gauge-needle">
              <line
                x1="50" y1="50" x2="50" y2="23"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
            <circle cx="50" cy="50" r="4" fill="#ffffff" />
          </svg>
        </div>

        <h1 className="stop-loading-title">stopmeter</h1>
        <p className="stop-loading-subtitle">
          SMART MANAGEMENT SYSTEM
        </p>

        <div className="stop-loading-progress">
          <div className="stop-loading-progress-bar" />
        </div>

        <p className="stop-loading-status">
          Preparing your workspace
        </p>

        <div className="stop-loading-dots">
          <span />
          <span />
          <span />
        </div>

      </div>
      <div className="stop-loading-version">STOPMETER SYSTEM</div>
    </div>
  );
}
