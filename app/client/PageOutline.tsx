import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Anchor } from '../shared/docs.js';

// Sommaire de page façon zeroheight : un trait par intertitre, le trait de la
// section lue en foncé ; au survol (ou au clavier) la liste des titres apparaît.
// Suit le défilement de la colonne de page, pas celui de la fenêtre.
export default function PageOutline({
  title,
  anchors,
  scroller,
}: {
  title: string;
  anchors: Anchor[];
  scroller: RefObject<HTMLElement | null>;
}) {
  const [active, setActive] = useState<string | null>(null);
  // Section choisie dans le sommaire : elle reste active jusqu'au prochain
  // défilement de la personne, même si la page ne peut pas descendre assez.
  const chosen = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const end = scroller.current;
    if (!end) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (chosen.current !== undefined) return setActive(chosen.current);
      let current: string | null = null;
      const top = end.getBoundingClientRect().top;
      for (const a of anchors) {
        const el = document.getElementById(a.id);
        if (el && el.getBoundingClientRect().top - top <= 120) current = a.id;
      }
      // En bas de page, le dernier intertitre ne remonte jamais jusqu'en haut.
      if (
        anchors.length &&
        end.scrollTop > 0 &&
        end.scrollTop + end.clientHeight >= end.scrollHeight - 2
      )
        current = anchors[anchors.length - 1].id;
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const release = () => {
      chosen.current = undefined;
    };
    update();
    end.addEventListener('scroll', onScroll, { passive: true });
    for (const type of ['wheel', 'touchstart', 'keydown'])
      end.addEventListener(type, release, { passive: true });
    return () => {
      end.removeEventListener('scroll', onScroll);
      for (const type of ['wheel', 'touchstart', 'keydown'])
        end.removeEventListener(type, release);
      cancelAnimationFrame(frame);
    };
  }, [anchors, scroller]);

  if (anchors.length < 2) return null;
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const go = (id: string | null) => {
    chosen.current = id;
    setActive(id);
    const el = id ? document.getElementById(id) : null;
    if (el) el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    else
      scroller.current?.scrollTo({
        top: 0,
        behavior: smooth ? 'smooth' : 'auto',
      });
  };

  return (
    <nav className="page-outline" aria-label="Sur cette page">
      <div className="page-outline-lines" aria-hidden="true">
        {anchors.map((a) => (
          <span
            key={a.id}
            className={`level-${a.level}${a.id === active ? ' active' : ''}`}
          />
        ))}
      </div>
      <div className="page-outline-card">
        <p>Sur cette page</p>
        <ul>
          <li>
            <button
              type="button"
              aria-current={active === null ? 'location' : undefined}
              onClick={() => go(null)}
            >
              {title}
            </button>
          </li>
          {anchors.map((a) => (
            <li key={a.id} className={`level-${a.level}`}>
              <button
                type="button"
                aria-current={a.id === active ? 'location' : undefined}
                onClick={() => go(a.id)}
              >
                {a.text}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
