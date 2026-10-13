'use client';

import { useId } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp, X } from 'lucide-react';
import type { Correction, LanguageCode } from '@/lib/schemas';
import { useCorrectionPopover } from './useCorrectionPopover';
import { BoldText } from '@/components/ui/text/BoldText';

export function CorrectionExplanation({
  issues,
  language,
}: {
  issues: Correction['issues'];
  language: LanguageCode;
}) {
  const id = useId();
  const popover = useCorrectionPopover();

  return (
    <>
      <button
        ref={popover.trigger}
        type="button"
        className="correction-help"
        aria-label="Explain correction"
        aria-haspopup="dialog"
        aria-expanded={popover.isOpen}
        aria-controls={popover.isOpen ? id : undefined}
        onClick={popover.toggle}
      >
        <CircleHelp
          size={18}
          aria-hidden="true"
        />
      </button>
      {popover.isOpen &&
        popover.portalTarget &&
        createPortal(
          <div
            ref={popover.panel}
            id={id}
            className="correction-popover"
            role="dialog"
            aria-labelledby={`${id}-title`}
            aria-describedby={`${id}-issues`}
          >
            <div className="correction-popover-header">
              <span
                className="correction-mark"
                aria-hidden="true"
              >
                <CircleHelp size={17} />
              </span>
              <h3 id={`${id}-title`}>Correction</h3>
              <button
                type="button"
                className="correction-close"
                aria-label="Close explanation"
                onClick={() => popover.close(true)}
              >
                <X
                  size={17}
                  aria-hidden="true"
                />
              </button>
            </div>
            <ul
              id={`${id}-issues`}
              className="correction-notes"
              lang={language}
            >
              {issues.map((issue, index) => (
                <li key={index}>
                  <span
                    className="correction-category"
                    lang="en"
                  >
                    {issue.category}
                  </span>
                  <p dir="auto">
                    <BoldText text={issue.explanation} />
                  </p>
                </li>
              ))}
            </ul>
          </div>,
          popover.portalTarget,
        )}
    </>
  );
}
