import { useEffect, useRef } from 'react';

export default function ToSModal({ onAccept }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.showModal(); }, []);

  return (
    <dialog ref={ref} className="dialog tos-dialog" style={{ maxWidth: '540px', width: '90vw' }}>
      <div className="dialog-head">
        <h2>Terms of Service</h2>
      </div>
      <div className="dialog-body">
        <p style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '1rem' }}>
          WE ARE NOT THE OWNERS OF ALL THESE GAMES AND NEVER WILL CLAIM TO BE.
        </p>
        <p>This site aggregates browser games for educational and entertainment purposes. All games, trademarks, and copyrights belong to their respective owners.</p>
        <p style={{ marginTop: '0.75rem' }}>By continuing you acknowledge:</p>
        <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', lineHeight: 1.7 }}>
          <li>All games are property of their original creators.</li>
          <li>This site makes no claim of ownership over any game content.</li>
          <li>Use of this site is at your own risk.</li>
          <li>We are not responsible for the content of individual games.</li>
        </ul>
        <div className="dialog-actions" style={{ marginTop: '1.5rem' }}>
          <button className="btn primary" onClick={onAccept}>I Agree — Let me play!</button>
        </div>
      </div>
    </dialog>
  );
}
