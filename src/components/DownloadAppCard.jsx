import { useEffect, useState } from 'react'
import { downloadProjectAsZip } from '../lib/downloadZip'

/** Ticks once a second so the building state can show real elapsed time —
 *  "Installing & building… (8s)" vs "(2m 40s)" makes a slow-but-healthy
 *  build distinguishable from a stuck one, instead of a bare spinner. */
function useElapsedSeconds(since) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return Math.max(0, Math.floor((now - since) / 1000))
}

function formatElapsed(totalSeconds) {
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds}s`
}

const PHASE_LABEL = {
  generating: 'Generating your app…',
  installing: 'Installing & building…',
}

function BoxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8l-9-5-9 5 9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  )
}

export default function DownloadAppCard({ build }) {
  const elapsed = useElapsedSeconds(build.since ?? Date.now())

  if (build.status === 'generating' || build.status === 'installing') {
    return (
      <div className="build-card build-progress">
        <div className="build-icon build-spin">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 3a9 9 0 1 0 9 9" />
          </svg>
        </div>
        <div>
          <p className="build-title">{PHASE_LABEL[build.status]}</p>
          <p className="build-sub">({formatElapsed(elapsed)})</p>
        </div>
      </div>
    )
  }

  if (build.status === 'error') {
    return (
      <div className="build-card build-error">
        <div className="build-icon"><WarningIcon /></div>
        <div>
          <p className="build-title">Build failed</p>
          <p className="build-sub">{build.error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="build-card build-ready">
      <div className="build-icon"><BoxIcon /></div>
      <div className="build-info">
        <p className="build-title">App ready</p>
        <p className="build-sub">Installed and built successfully.</p>
      </div>
      <button className="download-btn" onClick={() => downloadProjectAsZip(build.files, build.projectName)}>
        <DownloadIcon />
        Download .zip
      </button>
    </div>
  )
}
